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
 * GET /api/support/admin/tickets
 * Get all tickets (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    await verifyAdmin();

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

    return NextResponse.json({
      success: true,
      tickets: ticketsWithCount,
      stats: statusCounts,
      pagination: {
        page,
        limit,
        totalTickets,
        totalPages: Math.ceil(totalTickets / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching admin tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets', details: error.message },
      { status: 500 }
    );
  }
}
