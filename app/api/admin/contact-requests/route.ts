import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import ContactRequest from '@/models/ContactRequest';

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

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const inquiryType = searchParams.get('inquiryType');
    const search = searchParams.get('search');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);

    await connectMongoose();

    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (inquiryType && inquiryType !== 'all') {
      query.inquiryType = inquiryType;
    }

    if (search) {
      query.$or = [
        { requestId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } }
      ];
    }

    const [totalLeads, leads, groupedStats] = await Promise.all([
      ContactRequest.countDocuments(query),
      ContactRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-callNotes')
        .lean(),
      ContactRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      new: 0,
      called: 0,
      'follow-up': 0,
      converted: 0,
      closed: 0
    };

    groupedStats.forEach((stat) => {
      if (Object.prototype.hasOwnProperty.call(stats, stat._id)) {
        stats[stat._id as keyof typeof stats] = stat.count;
      }
    });

    return NextResponse.json({
      success: true,
      leads,
      stats,
      pagination: {
        page,
        limit,
        totalLeads,
        totalPages: Math.ceil(totalLeads / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact requests', details: error.message },
      { status: 500 }
    );
  }
}