import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import SupportTicket from '@/models/SupportTicket';
import emailService from '@/services/emailService';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { invalidateAdminCacheByTags } from '@/lib/adminResponseCache';

/**
 * GET /api/support/admin/tickets/[id]
 * Get a specific ticket (admin view)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await enforceAdminAccess(req, {
      permission: 'support:read',
      rateLimitKey: 'support-ticket:get',
      limit: 100,
      windowMs: 60_000,
    });

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
      { status: getAdminErrorStatus(error) }
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
    await enforceAdminAccess(req, {
      permission: 'support:write',
      rateLimitKey: 'support-ticket:patch',
      limit: 40,
      windowMs: 60_000,
    });

    const { id } = await params;
    const ticketId = id;
    const body = await req.json();
    const { status, priority, message, adminName, assignedTo, tags } = body;

    if (message && (typeof message !== 'string' || message.trim().length > 3000)) {
      return NextResponse.json(
        { success: false, error: 'message must be a string up to 3000 characters' },
        { status: 400 }
      );
    }

    if (adminName && (typeof adminName !== 'string' || adminName.trim().length > 100)) {
      return NextResponse.json(
        { success: false, error: 'adminName must be a string up to 100 characters' },
        { status: 400 }
      );
    }

    if (assignedTo !== undefined && typeof assignedTo !== 'string') {
      return NextResponse.json(
        { success: false, error: 'assignedTo must be a string' },
        { status: 400 }
      );
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags) || tags.length > 20 || tags.some((tag) => typeof tag !== 'string' || tag.length > 30)) {
        return NextResponse.json(
          { success: false, error: 'tags must be an array of up to 20 short strings' },
          { status: 400 }
        );
      }
    }

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

    invalidateAdminCacheByTags(['support']);

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
      { status: getAdminErrorStatus(error) }
    );
  }
}
