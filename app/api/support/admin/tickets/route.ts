import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import SupportTicket from '@/models/SupportTicket';
import emailService from '@/services/emailService';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

/**
 * GET /api/support/admin/tickets
 * Get all tickets (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    await enforceAdminAccess(req, {
      permission: 'support:read',
      rateLimitKey: 'support-tickets:get',
      limit: 80,
      windowMs: 60_000,
    });

    const cacheKey = `admin:support:list:v1:${new URL(req.url).searchParams.toString()}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const issueType = searchParams.get('issueType');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    await connectMongoose();

    // Build query
    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    if (issueType && issueType !== 'all') {
      query.issueType = issueType;
    }
    
    if (search) {
      query.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const totalTickets = await SupportTicket.countDocuments(query);

    // Get statistics
    const stats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = {
      open: 0,
      'in-progress': 0,
      resolved: 0,
      closed: 0
    };

    stats.forEach(stat => {
      statusCounts[stat._id as keyof typeof statusCounts] = stat.count;
    });

    // Get paginated tickets
    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Add response count
    const ticketsWithCount = tickets.map(ticket => ({
      ...ticket,
      responseCount: ticket.responses?.length || 0,
      hasUnreadResponses: !ticket.viewedByAdmin && ticket.lastUpdatedBy === 'user'
    }));

    const payload = {
      success: true,
      tickets: ticketsWithCount,
      stats: statusCounts,
      pagination: {
        page,
        limit,
        totalTickets,
        totalPages: Math.ceil(totalTickets / limit)
      }
    };

    setAdminCachedResponse(cacheKey, payload, 15_000, ['support']);

    return NextResponse.json(payload);

  } catch (error: any) {
    console.error('Error fetching admin tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets', details: error.message },
      { status: getAdminErrorStatus(error) }
    );
  }
}
