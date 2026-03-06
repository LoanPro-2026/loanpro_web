import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import SupportTicket from '@/models/SupportTicket';
import emailService from '@/services/emailService';
import { checkRateLimit } from '@/lib/rateLimit';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
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
  
  try {
    // Rate limiting check: 5 tickets per hour
    const identifier = req.headers.get('x-user-id') || req.headers.get('x-forwarded-for') || 'anonymous';
    const allowed = checkRateLimit(identifier, 5, 60 * 60 * 1000);
    
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await req.json();
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

    const normalizedAccessToken = typeof accessToken === 'string' ? accessToken.trim() : '';

    // Validation
    if (!userId || !userEmail || !subject || !description || !issueType || !appVersion) {
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
    if (userId === 'unknown') {
      return NextResponse.json(
        { success: false, error: 'Invalid user authentication. Please log in again.' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Validate issue type
    const validIssueTypes = ['bug', 'feature', 'question', 'billing', 'other'];
    if (!validIssueTypes.includes(issueType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid issue type' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { success: false, error: 'Invalid priority' },
        { status: 400, headers: corsHeaders }
      );
    }

    const verifiedUser = await verifySupportUserIdentity({ userId, userEmail, accessToken: normalizedAccessToken });
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
      userName: userName?.trim() || verifiedUser.fullName || verifiedUser.email,
      subject: subject.trim(),
      description: description.trim(),
      issueType,
      priority: priority || 'medium',
      status: 'open',
      appVersion,
      browserInfo,
      deviceInfo,
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
    ]).catch(err => console.error('Email sending failed:', err));

    return NextResponse.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    }, { status: 201, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error creating support ticket:', error);
    const corsHeaders = getCorsHeaders(req);
    return NextResponse.json(
      { success: false, error: 'Failed to create ticket', details: error.message },
      { status: 500, headers: corsHeaders }
    );
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
      console.error('Database query error:', dbError);
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
    console.error('Error fetching tickets:', error);
    const corsHeaders = getCorsHeaders(req);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
