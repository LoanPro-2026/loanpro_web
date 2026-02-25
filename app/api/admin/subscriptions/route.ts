import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'subscriptions:read',
      rateLimitKey: 'subscriptions:get',
      limit: 80,
      windowMs: 60_000,
    });

    const cacheKey = 'admin:subscriptions:list:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Get all subscriptions with user info
    const subscriptions = await db.collection('subscriptions')
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: 'userId',
            as: 'user'
          }
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            userName: { $arrayElemAt: ['$user.username', 0] },
            userEmail: { $arrayElemAt: ['$user.email', 0] },
            plan: 1,
            status: 1,
            startDate: 1,
            endDate: 1,
            billingPeriod: 1,
            amount: 1,
            createdAt: 1
          }
        },
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    const payload = { success: true, subscriptions };
    setAdminCachedResponse(cacheKey, payload, 20_000, ['subscriptions', 'dashboard']);

    return new Response(JSON.stringify(payload), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch subscriptions' }), { 
      status: getAdminErrorStatus(error),
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
