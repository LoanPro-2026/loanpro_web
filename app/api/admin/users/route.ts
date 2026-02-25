import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'users:read',
      rateLimitKey: 'users:get',
      limit: 80,
      windowMs: 60_000,
    });

    const cacheKey = 'admin:users:list:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Get all users with their subscription info
    const users = await db.collection('users')
      .aggregate([
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'userId',
            foreignField: 'userId',
            as: 'subscriptionData'
          }
        },
        {
          $addFields: {
            latestSubscription: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$subscriptionData',
                    as: 'sub',
                    cond: { $ne: ['$$sub.status', 'expired'] }
                  }
                },
                0
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            username: 1,
            email: 1,
            createdAt: 1,
            lastLogin: 1,
            subscription: {
              plan: '$latestSubscription.plan',
              status: '$latestSubscription.status',
              endDate: '$latestSubscription.endDate',
              billingPeriod: '$latestSubscription.billingPeriod'
            }
          }
        },
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    const payload = { success: true, users };
    setAdminCachedResponse(cacheKey, payload, 20_000, ['users', 'dashboard']);

    return new Response(JSON.stringify(payload), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch users' }), { 
      status: getAdminErrorStatus(error),
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
