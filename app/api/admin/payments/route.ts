import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'payments:read',
      rateLimitKey: 'payments:get',
      limit: 100,
      windowMs: 60_000,
    });

    // Get query parameters
    const url = new URL(request.url);
    const cacheKey = `admin:payments:v1:${url.searchParams.toString()}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), { status: 200 });
    }

    const { db } = await connectToDatabase();

    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const skip = parseInt(url.searchParams.get('skip') || '0');

    // Build filter
    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Fetch payments with resilient user/subscription lookups.
    // Some historical records use string userId, others may reference ObjectId-like values.
    const payments = await db.collection('payments')
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            let: { paymentUserId: '$userId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ['$userId', '$$paymentUserId'] },
                      { $eq: [{ $toString: '$_id' }, { $toString: '$$paymentUserId' }] }
                    ]
                  }
                }
              },
              { $limit: 1 }
            ],
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'subscriptions',
            let: { subId: '$subscriptionId', paymentUserId: '$userId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: [{ $toString: '$_id' }, { $toString: '$$subId' }] },
                      { $eq: ['$userId', '$$paymentUserId'] }
                    ]
                  }
                }
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 }
            ],
            as: 'subscription'
          }
        },
        {
          $project: {
            id: { $toString: '$_id' },
            userId: { $toString: '$userId' },
            subscriptionId: { $toString: '$subscriptionId' },
            userName: {
              $ifNull: [
                { $arrayElemAt: ['$user.username', 0] },
                { $arrayElemAt: ['$user.name', 0] }
              ]
            },
            userEmail: { $arrayElemAt: ['$user.email', 0] },
            plan: {
              $ifNull: [
                '$plan',
                {
                  $ifNull: [
                    { $arrayElemAt: ['$subscription.plan', 0] },
                    { $arrayElemAt: ['$subscription.subscriptionPlan', 0] }
                  ]
                }
              ]
            },
            amount: '$amount',
            currency: 1,
            status: 1,
            razorpayOrderId: 1,
            razorpayPaymentId: 1,
            paymentMethod: 1,
            createdAt: 1,
            completedAt: 1,
            failureReason: 1
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ])
      .toArray();

    // Get total count
    const totalCount = await db.collection('payments').countDocuments(filter);

    const payload = {
      payments,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + limit < totalCount
      }
    };

    setAdminCachedResponse(cacheKey, payload, 15_000, ['payments', 'dashboard']);

    return new Response(JSON.stringify(payload), { status: 200 });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch payments' }), { status: getAdminErrorStatus(error) });
  }
}
