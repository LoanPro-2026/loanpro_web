import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import SupportTicket from '@/models/SupportTicket';
import emailService from '@/services/emailService';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import { connectToDatabase } from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

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
 * OPTIONS /api/support/tickets
 * Handle CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return handleCorsPreFlight(req);
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
 */
export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };
  
  try {
    const userIdHeader = req.headers.get('x-user-id')?.trim();
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'support-tickets-create',
      limit: 5,
      windowMs: 60 * 60 * 1000,
      userId: userIdHeader || undefined,
    });

    if (rateLimitResponse) {
      return applyCors(rateLimitResponse);
    }

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 96 * 1024 });
    if (!parsedBody.ok) {
      return applyCors(parsedBody.response);
    }

    const body = parsedBody.data;
    const {
      userId,
      userEmail,
      userName,
      subject,
      description,
      issueType,
      priority,
      appVersion,
      browserInfo,
      deviceInfo,
      accessToken
    } = body;

    const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
    const normalizedUserEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
    const normalizedUserName = typeof userName === 'string' ? userName.trim() : '';
    const normalizedSubject = typeof subject === 'string' ? subject.trim() : '';
    const normalizedDescription = typeof description === 'string' ? description.trim() : '';
    const normalizedIssueType = typeof issueType === 'string' ? issueType.trim().toLowerCase() : '';
    const normalizedPriority = typeof priority === 'string' ? priority.trim().toLowerCase() : '';
    const normalizedAppVersion = typeof appVersion === 'string' ? appVersion.trim() : '';
    const normalizedBrowserInfo = typeof browserInfo === 'string' ? browserInfo.trim() : browserInfo;
    const normalizedDeviceInfo = typeof deviceInfo === 'string' ? deviceInfo.trim() : deviceInfo;
    const normalizedAccessToken = typeof accessToken === 'string' ? accessToken.trim() : '';

    // Validation
    if (!normalizedUserId || !normalizedUserEmail || !normalizedSubject || !normalizedDescription || !normalizedIssueType || !normalizedAppVersion) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (isProduction && !normalizedAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required in production.' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Reject only if userId is explicitly 'unknown'
    if (normalizedUserId === 'unknown') {
      return NextResponse.json(
        { success: false, error: 'Invalid user authentication. Please log in again.' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Validate issue type
    const validIssueTypes = ['bug', 'feature', 'question', 'billing', 'other'];
    if (!validIssueTypes.includes(normalizedIssueType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid issue type' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (normalizedPriority && !validPriorities.includes(normalizedPriority)) {
      return NextResponse.json(
        { success: false, error: 'Invalid priority' },
        { status: 400, headers: corsHeaders }
      );
    }

    const verifiedUser = await verifySupportUserIdentity({
      userId: normalizedUserId,
      userEmail: normalizedUserEmail,
      accessToken: normalizedAccessToken,
    });
    if (!verifiedUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication context. Please sign in again.' },
        { status: 401, headers: corsHeaders }
      );
    }

    await connectMongoose();

    // Create ticket
    const ticket = new SupportTicket({
      userId: verifiedUser.userId,
      userEmail: verifiedUser.email,
      userName: normalizedUserName || verifiedUser.fullName || verifiedUser.email,
      subject: normalizedSubject,
      description: normalizedDescription,
      issueType: normalizedIssueType,
      priority: normalizedPriority || 'medium',
      status: 'open',
      appVersion: normalizedAppVersion,
      browserInfo: normalizedBrowserInfo,
      deviceInfo: normalizedDeviceInfo,
      attachments: [],
      responses: [],
      tags: [],
      viewedByUser: true,
      viewedByAdmin: false,
      lastUpdatedBy: 'user'
    });

    await ticket.save();

    // Send email notifications (don't wait for them)
    const ticketData = {
      ticketId: ticket.ticketId,
      userName: ticket.userName,
      userEmail: ticket.userEmail,
      subject: ticket.subject,
      description: ticket.description,
      issueType: ticket.issueType,
      priority: ticket.priority,
      appVersion: ticket.appVersion
    };

    // Send emails asynchronously
    Promise.all([
      emailService.sendNewTicketNotificationToAdmin(ticketData),
      emailService.sendTicketConfirmationToUser(ticketData)
    ]).catch((err) => logger.warn('Support ticket email delivery failed', 'SUPPORT_TICKETS', {
      ticketId: ticket.ticketId,
      error: err instanceof Error ? err.message : 'unknown',
    }));

    return NextResponse.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    }, { status: 201, headers: corsHeaders });

  } catch (error: any) {
    logger.error('Error creating support ticket', error, 'SUPPORT_TICKETS');
    return applyCors(toSafeErrorResponse(error, 'SUPPORT_TICKETS', 'Failed to create ticket'));
  }
}

/**
 * GET /api/support/tickets?userId=xxx
 * Get all tickets for a user
 */
export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { searchParams } = new URL(req.url);
    const requestedUserEmail = searchParams.get('userEmail') || searchParams.get('email') || searchParams.get('userId');
    const requestedUserId = searchParams.get('userId') || undefined;
    const queryAccessToken = searchParams.get('accessToken') || undefined;
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const accessToken = queryAccessToken || bearerToken;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

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
      userEmail: requestedUserEmail || undefined,
      accessToken,
    });

    if (!verifiedUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid user authentication. Please log in again.' },
        { status: 401, headers: corsHeaders }
      );
    }

    await connectMongoose();

    // Query by verified identity to prevent cross-account ticket reads.
    const query: any = { userEmail: verifiedUser.email };
    if (status && status !== 'all') {
      query.status = status;
    }

    try {
      // Get total count with timeout
      const totalTickets = await SupportTicket.countDocuments(query).maxTimeMS(5000);

      // Get paginated tickets with timeout
      const tickets = await SupportTicket.find(query)
        .select('-responses') // Exclude responses for list view
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .maxTimeMS(5000);

      // Add response count to each ticket
      const ticketsWithCount = tickets.map((ticket: any) => ({
        ...ticket,
        responseCount: ticket.responses?.length || 0,
        hasUnreadResponses: !ticket.viewedByUser && ticket.lastUpdatedBy === 'admin'
      }));

      return NextResponse.json({
        success: true,
        tickets: ticketsWithCount,
        pagination: {
          page,
          limit,
          totalTickets,
          totalPages: Math.ceil(totalTickets / limit)
        }
      }, { headers: corsHeaders });
    } catch (dbError: any) {
      logger.error('Support tickets database query error', dbError, 'SUPPORT_TICKETS');
      // If database is slow, return empty results instead of erroring
      if (dbError.name === 'MongooseError' || dbError.message?.includes('buffering timed out')) {
        return NextResponse.json({
          success: true,
          tickets: [],
          pagination: {
            page,
            limit,
            totalTickets: 0,
            totalPages: 0
          }
        }, { headers: corsHeaders });
      }
      throw dbError;
    }

  } catch (error: any) {
    logger.error('Error fetching tickets', error, 'SUPPORT_TICKETS');
    const corsHeaders = getCorsHeaders(req);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
