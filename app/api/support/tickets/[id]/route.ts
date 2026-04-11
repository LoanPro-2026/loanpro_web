import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import SupportTicket from '@/models/SupportTicket';
import emailService from '@/services/emailService';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';
import { connectToDatabase } from '@/lib/mongodb';

type VerifiedSupportUser = {
  userId: string;
  email: string;
  fullName: string;
};

const isProduction = process.env.NODE_ENV === 'production';

async function verifySupportUserIdentity(params: {
  userId?: string;
  userEmail?: string;
  accessToken?: string;
}): Promise<VerifiedSupportUser | null> {
  const { db } = await connectToDatabase();
  const normalizedUserId = (params.userId || '').trim();
  const normalizedEmail = (params.userEmail || '').trim().toLowerCase();
  const normalizedToken = (params.accessToken || '').trim();

  if (normalizedToken) {
    const user = await db.collection('users').findOne({ accessToken: normalizedToken });
    if (!user) return null;

    const tokenUserId = String(user.userId || '');
    const tokenEmail = String(user.email || '').trim().toLowerCase();
    if (!tokenUserId || !tokenEmail) return null;

    if (normalizedUserId && normalizedUserId !== tokenUserId) return null;
    if (normalizedEmail && normalizedEmail !== tokenEmail) return null;

    return {
      userId: tokenUserId,
      email: tokenEmail,
      fullName: String(user.fullName || user.username || '').trim(),
    };
  }

  if (!normalizedUserId || !normalizedEmail) {
    return null;
  }

  const user = await db.collection('users').findOne({ userId: normalizedUserId, email: normalizedEmail });
  if (!user) return null;

  return {
    userId: normalizedUserId,
    email: normalizedEmail,
    fullName: String(user.fullName || user.username || '').trim(),
  };
}

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
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };
  
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'support-ticket-get',
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const { id } = await params;
    const ticketId = id;
    const { searchParams } = new URL(req.url);
    const requestedUserEmail = searchParams.get('userEmail') || searchParams.get('email') || searchParams.get('userId') || undefined;
    const requestedUserId = searchParams.get('userId') || undefined;
    const queryAccessToken = searchParams.get('accessToken') || undefined;
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const accessToken = queryAccessToken || bearerToken;

    if (!requestedUserEmail && !requestedUserId) {
      return NextResponse.json(
        { success: false, error: 'userEmail or userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (isProduction && !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required in production.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const verifiedUser = await verifySupportUserIdentity({
      userId: requestedUserId,
      userEmail: requestedUserEmail,
      accessToken,
    });

    if (!verifiedUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid user authentication. Please log in again.' },
        { status: 401, headers: corsHeaders }
      );
    }

    await connectMongoose();

    const ticket = await SupportTicket.findOne({ ticketId }).lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify ownership - check userEmail instead of userId since userId param contains the email
    if (ticket.userEmail !== verifiedUser.email) {
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
    logger.error('Error fetching support ticket', error, 'SUPPORT_TICKETS');
    return applyCors(toSafeErrorResponse(error, 'SUPPORT_TICKETS', 'Failed to fetch ticket'));
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
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };
  
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'support-ticket-patch',
      limit: 20,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const { id } = await params;
    const ticketId = id;
    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 64 * 1024 });
    if (!parsedBody.ok) return applyCors(parsedBody.response);

    const body = parsedBody.data as Record<string, any>;
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const userEmail = typeof body.userEmail === 'string' ? body.userEmail.trim().toLowerCase() : '';
    const message = typeof body.message === 'string' ? body.message : '';
    const bodyAccessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const accessToken = bodyAccessToken || bearerToken;

    if ((!userEmail && !userId) || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (isProduction && !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required in production.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const verifiedUser = await verifySupportUserIdentity({ userId, userEmail, accessToken });
    if (!verifiedUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid user authentication. Please log in again.' },
        { status: 401, headers: corsHeaders }
      );
    }

    await connectMongoose();

    const ticket = await SupportTicket.findOne({ ticketId });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify ownership - check userEmail instead of userId since userId param contains the email
    if (ticket.userEmail !== verifiedUser.email) {
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
    }).catch((err) => logger.warn('Failed to send support update email', 'SUPPORT_TICKETS', {
      ticketId: ticket.ticketId,
      error: err instanceof Error ? err.message : 'unknown',
    }));

    return NextResponse.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        updatedAt: ticket.updatedAt
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    logger.error('Error updating support ticket', error, 'SUPPORT_TICKETS');
    return applyCors(toSafeErrorResponse(error, 'SUPPORT_TICKETS', 'Failed to update ticket'));
  }
}
