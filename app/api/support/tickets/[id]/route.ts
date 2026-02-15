import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import SupportTicket from '@/models/SupportTicket';
import emailService from '@/services/emailService';

/**
 * GET /api/support/tickets/[id]
 * Get a specific ticket by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    await clientPromise;

    const ticket = await SupportTicket.findOne({ ticketId }).lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (ticket.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Mark as viewed by user
    await SupportTicket.updateOne(
      { ticketId },
      { $set: { viewedByUser: true } }
    );

    return NextResponse.json({
      success: true,
      ticket
    });

  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticket', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/support/tickets/[id]
 * Add a response to a ticket from user
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const body = await req.json();
    const { userId, message } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await clientPromise;

    const ticket = await SupportTicket.findOne({ ticketId });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (ticket.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Add response
    ticket.responses.push({
      from: 'user',
      message: message.trim(),
      timestamp: new Date()
    });

    ticket.lastUpdatedBy = 'user';
    ticket.viewedByAdmin = false;

    // Reopen ticket if it was closed
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      ticket.status = 'open';
    }

    await ticket.save();

    // Send email notification to admin
    emailService.sendNewTicketNotificationToAdmin({
      ticketId: ticket.ticketId,
      userName: ticket.userName,
      userEmail: ticket.userEmail,
      subject: `Re: ${ticket.subject}`,
      description: message,
      issueType: ticket.issueType,
      priority: ticket.priority,
      appVersion: ticket.appVersion
    }).catch(err => console.error('Failed to send email:', err));

    return NextResponse.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        updatedAt: ticket.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket', details: error.message },
      { status: 500 }
    );
  }
}
