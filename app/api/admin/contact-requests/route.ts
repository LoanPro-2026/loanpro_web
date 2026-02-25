import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import ContactRequest from '@/models/ContactRequest';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(req: NextRequest) {
  try {
    await enforceAdminAccess(req, {
      permission: 'leads:read',
      rateLimitKey: 'leads:get',
      limit: 80,
      windowMs: 60_000,
    });

    const cacheKey = `admin:leads:list:v1:${new URL(req.url).searchParams.toString()}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

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

    const payload = {
      success: true,
      leads,
      stats,
      pagination: {
        page,
        limit,
        totalLeads,
        totalPages: Math.ceil(totalLeads / limit)
      }
    };

    setAdminCachedResponse(cacheKey, payload, 15_000, ['leads']);

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact requests', details: error.message },
      { status: getAdminErrorStatus(error) }
    );
  }
}