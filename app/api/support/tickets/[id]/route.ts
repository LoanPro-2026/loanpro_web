import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import SupportTicket from '@/models/SupportTicket';
import emailService from '@/services/emailService';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';

/**
 * OPTIONS /api/support/tickets/[id]
 * Handle CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return handleCorsPreFlight(req);
}

/**
 * GET /api/support/tickets/[id]
 * Get a specific ticket by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { id } = await params;
    const ticketId = id;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Reject only if userId is explicitly 'unknown'
    if (userId === 'unknown') {
      return NextResponse.json(
        { success: false, error: 'Invalid user authentication. Please log in again.' },
        { status: 401, headers: corsHeaders }
      );
    }

    await clientPromise;

    const ticket = await SupportTicket.findOne({ ticketId }).lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify ownership
    if (ticket.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403, headers: corsHeaders }
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
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    const corsHeaders = getCorsHeaders(req);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticket', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/support/tickets/[id]
 * Add a response to a ticket from user
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { id } = await params;
    const ticketId = id;
    const body = await req.json();
    const { userId, message } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Reject only if userId is explicitly 'unknown'
    if (userId === 'unknown') {
      return NextResponse.json(
        { success: false, error: 'Invalid user authentication. Please log in again.' },
        { status: 401, headers: corsHeaders }
      );
    }

    await clientPromise;

    const ticket = await SupportTicket.findOne({ ticketId });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify ownership
    if (ticket.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403, headers: corsHeaders }
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
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error updating ticket:', error);
    const corsHeaders = getCorsHeaders(req);
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
