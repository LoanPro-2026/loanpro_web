import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'dashboard:read',
      rateLimitKey: 'analytics:get',
      limit: 60,
      windowMs: 60_000,
    });

    const url = new URL(request.url);
    const cacheKey = `admin:analytics:v1:${url.searchParams.toString()}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), { status: 200 });
    }

    const { db } = await connectToDatabase();

    // Calculate date ranges
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);

    // Fetch all data in parallel
    const [
      totalUsers,
      newUsersThisMonth,
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      dailyRevenue,
      paymentRecords,
      subscriptionsByPlan,
      usersByPlan
    ] = await Promise.all([
      // User counts
      db.collection('users').countDocuments(),
      db.collection('users').countDocuments({ createdAt: { $gte: monthStart } }),

      // Subscription counts
      db.collection('subscriptions').countDocuments(),
      db.collection('subscriptions').countDocuments({ status: 'active' }),
      db.collection('subscriptions').countDocuments({ status: 'trial' }),
      db.collection('subscriptions').countDocuments({ status: 'expired' }),
      db.collection('subscriptions').countDocuments({ status: 'cancelled' }),

      // Revenue calculations
      db.collection('payments')
        .aggregate([
          { $match: { status: { $in: ['completed', 'captured', 'success'] } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: [{ $gt: ['$amount', 1000] }, { $divide: ['$amount', 100] }, '$amount']
                }
              }
            }
          }
        ])
        .toArray(),
      db.collection('payments')
        .aggregate([
          { $match: { status: { $in: ['completed', 'captured', 'success'] }, createdAt: { $gte: monthStart } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: [{ $gt: ['$amount', 1000] }, { $divide: ['$amount', 100] }, '$amount']
                }
              }
            }
          }
        ])
        .toArray(),
      db.collection('payments')
        .aggregate([
          { $match: { status: { $in: ['completed', 'captured', 'success'] }, createdAt: { $gte: weekStart } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: [{ $gt: ['$amount', 1000] }, { $divide: ['$amount', 100] }, '$amount']
                }
              }
            }
          }
        ])
        .toArray(),
      db.collection('payments')
        .aggregate([
          { $match: { status: { $in: ['completed', 'captured', 'success'] }, createdAt: { $gte: dayStart } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $cond: [{ $gt: ['$amount', 1000] }, { $divide: ['$amount', 100] }, '$amount']
                }
              }
            }
          }
        ])
        .toArray(),

      // Revenue by month for trend
      db.collection('payments')
        .aggregate([
          { $match: { status: { $in: ['completed', 'captured', 'success'] } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              revenue: {
                $sum: {
                  $cond: [{ $gt: ['$amount', 1000] }, { $divide: ['$amount', 100] }, '$amount']
                }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: -1 } },
          { $limit: 12 }
        ])
        .toArray(),

      // Subscriptions by plan
      db.collection('subscriptions')
        .aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$plan', count: { $sum: 1 } } }
        ])
        .toArray(),

      // Users by plan
      db.collection('users')
        .aggregate([
          {
            $lookup: {
              from: 'subscriptions',
              let: { userId: '$userId', userObjectId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$userId', '$$userId'] },
                            { $eq: [{ $toString: '$userId' }, { $toString: '$$userObjectId' }] }
                          ]
                        },
                        { $eq: ['$status', 'active'] }
                      ]
                    }
                  }
                },
                { $limit: 1 }
              ],
              as: 'currentSubscription'
            }
          },
          {
            $group: {
              _id: { $arrayElemAt: ['$currentSubscription.plan', 0] },
              count: { $sum: 1 }
            }
          }
        ])
        .toArray()
    ]);

    // Calculate metrics
    const totalRevenueAmount = (totalRevenue[0]?.total || 0) as number;
    const avgSubscriptionValue = totalRevenueAmount > 0
      ? Math.round(totalRevenueAmount / activeSubscriptions * 100) / 100
      : 0;

    const churnRate = activeSubscriptions + cancelledSubscriptions > 0
      ? Math.round((cancelledSubscriptions / (activeSubscriptions + cancelledSubscriptions)) * 100 * 100) / 100
      : 0;

    const monthlyRecurringRevenue = activeSubscriptions * (avgSubscriptionValue);

    // Most popular plan
    const mostPopularPlan = subscriptionsByPlan.length > 0
      ? subscriptionsByPlan.reduce((max: any, plan: any) =>
          plan.count > (max.count || 0) ? plan : max
        )
      : null;

    const payload = {
      revenue: {
        total: totalRevenue[0]?.total || 0,
        monthly: monthlyRevenue[0]?.total || 0,
        weekly: weeklyRevenue[0]?.total || 0,
        daily: dailyRevenue[0]?.total || 0,
        mrr: monthlyRecurringRevenue,
        cltv: activeSubscriptions > 0
          ? Math.round(((monthlyRevenue[0]?.total || 0) * 36) / activeSubscriptions * 100) / 100
          : 0,
        trend: paymentRecords.reverse().map((r: any) => ({
          month: r._id,
          revenue: r.revenue,
          transactions: r.count
        }))
      },
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        active30d: activeSubscriptions,
        byPlan: usersByPlan
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        trial: trialSubscriptions,
        expired: expiredSubscriptions,
        cancelled: cancelledSubscriptions,
        byPlan: subscriptionsByPlan,
        avgValue: avgSubscriptionValue,
        churnRate: churnRate
      },
      insights: {
        mostPopularPlan: mostPopularPlan?._id || 'N/A',
        conversionRate: totalUsers > 0
          ? Math.round((activeSubscriptions / totalUsers) * 100 * 100) / 100
          : 0,
        retentionRate: 100 - churnRate,
        weeklyRevenueTrend: weeklyRevenue[0]?.total || 0 > 0 ? 'positive' : 'stable'
      }
    };

    setAdminCachedResponse(cacheKey, payload, 25_000, ['dashboard', 'analytics', 'payments', 'subscriptions', 'users']);

    return new Response(JSON.stringify(payload), { status: 200 });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), { status: getAdminErrorStatus(error) });
  }
}
