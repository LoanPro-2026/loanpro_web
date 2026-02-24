import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import SupportTicket from '@/models/SupportTicket';
import emailService from '@/services/emailService';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-admin-email@gmail.com';

async function verifyAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }
  });
  const user = await userResponse.json();
  const userEmail = user.email_addresses[0]?.email_address;

  if (userEmail !== ADMIN_EMAIL) throw new Error('Access denied');
  return userEmail;
}

/**
 * GET /api/support/admin/tickets/[id]
 * Get a specific ticket (admin view)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();

    const { id } = await params;
    const ticketId = id;
    await connectMongoose();

    const ticket = await SupportTicket.findOne({ ticketId }).lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Mark as viewed by admin
    await SupportTicket.updateOne(
      { ticketId },
      { $set: { viewedByAdmin: true } }
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
 * PATCH /api/support/admin/tickets/[id]
 * Update ticket (admin only) - change status, add response
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();

    const { id } = await params;
    const ticketId = id;
    const body = await req.json();
    const { status, priority, message, adminName, assignedTo, tags } = body;

    await connectMongoose();

    const ticket = await SupportTicket.findOne({ ticketId });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    let shouldSendEmail = false;
    let emailMessage = '';

    // Update status if provided
    if (status && ['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      const oldStatus = ticket.status;
      ticket.status = status;
      
      if (oldStatus !== status) {
        shouldSendEmail = true;
        emailMessage = `Your ticket status has been updated to: ${status}`;
      }
    }

    // Update priority if provided
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      ticket.priority = priority;
    }

    // Update assignedTo if provided
    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo;
    }

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      ticket.tags = tags;
    }

    // Add admin response if provided
    if (message) {
      ticket.responses.push({
        from: 'admin',
        message: message.trim(),
        timestamp: new Date(),
        adminName: adminName || 'Support Team'
      });
      
      shouldSendEmail = true;
      emailMessage = message;
    }

    ticket.lastUpdatedBy = 'admin';
    ticket.viewedByUser = false;

    await ticket.save();

    // Send email notification to user
    if (shouldSendEmail) {
      emailService.sendTicketUpdateToUser({
        ticketId: ticket.ticketId,
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        subject: ticket.subject,
        status: ticket.status,
        message: emailMessage
      }).catch(err => console.error('Failed to send email:', err));
    }

    return NextResponse.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
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
