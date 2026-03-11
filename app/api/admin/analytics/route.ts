import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

const SUCCESS_STATUS_REGEX = /^(completed|captured|success|paid)$/i;

type UsageLevel = 'ok' | 'warning' | 'critical';

interface ProviderUsageMetric {
  key: string;
  name: string;
  configured: boolean;
  usage: number;
  limit: number;
  unit: string;
  utilizationPct: number;
  level: UsageLevel;
  source: 'live' | 'snapshot' | 'estimated';
  updatedAt: string;
  headroom: number;
  projectedEndOfMonthUsage: number;
  projectedUtilizationPct: number;
  freshnessHours: number;
}

function parseLimitEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return raw;
}

function parseLimitValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function toUtilization(usage: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.max(0, Math.round((usage / limit) * 10000) / 100);
}

function usageLevel(utilizationPct: number): UsageLevel {
  if (utilizationPct >= 90) return 'critical';
  if (utilizationPct >= 70) return 'warning';
  return 'ok';
}

function buildUsageMetric(input: {
  key: string;
  name: string;
  configured: boolean;
  usage: number;
  limit: number;
  unit: string;
  source: ProviderUsageMetric['source'];
  updatedAt?: Date | string | null;
  dayProgress: number;
}): ProviderUsageMetric {
  const safeUsage = Number.isFinite(input.usage) ? Math.max(0, input.usage) : 0;
  const safeLimit = Number.isFinite(input.limit) && input.limit > 0 ? input.limit : 1;
  const utilizationPct = toUtilization(safeUsage, safeLimit);
  const updatedDate = input.updatedAt ? new Date(input.updatedAt) : new Date();
  const updatedAt = updatedDate.toISOString();
  const dayProgress = Math.min(Math.max(input.dayProgress, 0.01), 1);
  const projectedEndOfMonthUsage = Math.round((safeUsage / dayProgress) * 100) / 100;
  const projectedUtilizationPct = toUtilization(projectedEndOfMonthUsage, safeLimit);
  const freshnessHours = Math.max(0, Math.round(((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60)) * 100) / 100);

  return {
    key: input.key,
    name: input.name,
    configured: input.configured,
    usage: safeUsage,
    limit: safeLimit,
    unit: input.unit,
    utilizationPct,
    level: usageLevel(utilizationPct),
    source: input.source,
    updatedAt,
    headroom: Math.max(0, Math.round((safeLimit - safeUsage) * 100) / 100),
    projectedEndOfMonthUsage,
    projectedUtilizationPct,
    freshnessHours,
  };
}

async function getLatestSnapshotMap(db: any) {
  try {
    const snapshots = await db.collection('usage_snapshots')
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const map = new Map<string, any>();
    for (const row of snapshots) {
      const provider = String(row.provider || '').trim().toLowerCase();
      const metricKey = String(row.metricKey || '').trim().toLowerCase();
      if (!provider || !metricKey) continue;
      const key = `${provider}:${metricKey}`;
      if (!map.has(key)) {
        map.set(key, row);
      }
    }

    return map;
  } catch {
    return new Map<string, any>();
  }
}

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
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const weekStart = new Date(today);
      const monthElapsedMs = Math.max(1, today.getTime() - monthStart.getTime());
      const monthTotalMs = Math.max(1, monthEnd.getTime() - monthStart.getTime());
      const dayProgress = Math.min(1, monthElapsedMs / monthTotalMs);

    weekStart.setDate(today.getDate() - 7);
    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);

    const snapshotMapPromise = getLatestSnapshotMap(db);
    const dbStatsPromise = db.stats();

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
          { $match: { status: { $regex: SUCCESS_STATUS_REGEX } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: '$amount'
              }
            }
          }
        ])
        .toArray(),
      db.collection('payments')
        .aggregate([
          { $match: { status: { $regex: SUCCESS_STATUS_REGEX }, createdAt: { $gte: monthStart } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: '$amount'
              }
            }
          }
        ])
        .toArray(),
      db.collection('payments')
        .aggregate([
          { $match: { status: { $regex: SUCCESS_STATUS_REGEX }, createdAt: { $gte: weekStart } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: '$amount'
              }
            }
          }
        ])
        .toArray(),
      db.collection('payments')
        .aggregate([
          { $match: { status: { $regex: SUCCESS_STATUS_REGEX }, createdAt: { $gte: dayStart } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: '$amount'
              }
            }
          }
        ])
        .toArray(),

      // Revenue by month for trend
      db.collection('payments')
        .aggregate([
          { $match: { status: { $regex: SUCCESS_STATUS_REGEX } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              revenue: {
                $sum: '$amount'
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

    const [snapshotMap, dbStats, backendApiEventsThisMonth, monitoringSettingsDoc] = await Promise.all([
      snapshotMapPromise,
      dbStatsPromise,
      db.collection('analytics').countDocuments({ createdAt: { $gte: monthStart } }),
      db.collection('admin_settings').findOne({ key: 'monitoring' }),
    ]);

    const monitoringConfig = monitoringSettingsDoc?.value || {};
    const configuredProviders = {
      vercel: Boolean(process.env.VERCEL || process.env.VERCEL_PROJECT_ID || monitoringConfig?.providers?.vercel?.apiToken),
      cloudRun: Boolean(
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.CLOUD_RUN_SERVICE ||
        monitoringConfig?.providers?.cloudRun?.serviceAccountJson
      ),
      clerk: Boolean(process.env.CLERK_SECRET_KEY || monitoringConfig?.providers?.clerk?.secretKey),
      brevo: Boolean(process.env.BREVO_API_KEY || monitoringConfig?.providers?.brevo?.apiKey),
    };

    const monitoringLimits = {
      mongodbStorageGb: parseLimitValue(
        monitoringConfig?.limits?.mongodbStorageGb,
        parseLimitEnv('MONGODB_STORAGE_LIMIT_GB', 10)
      ),
      vercelRequestsMonthly: parseLimitValue(
        monitoringConfig?.limits?.vercelRequestsMonthly,
        parseLimitEnv('VERCEL_REQUEST_LIMIT_MONTHLY', 1_000_000)
      ),
      cloudRunRequestsMonthly: parseLimitValue(
        monitoringConfig?.limits?.cloudRunRequestsMonthly,
        parseLimitEnv('CLOUD_RUN_REQUEST_LIMIT_MONTHLY', 1_000_000)
      ),
      clerkMauMonthly: parseLimitValue(
        monitoringConfig?.limits?.clerkMauMonthly,
        parseLimitEnv('CLERK_MAU_LIMIT_MONTHLY', 10_000)
      ),
      brevoEmailsMonthly: parseLimitValue(
        monitoringConfig?.limits?.brevoEmailsMonthly,
        parseLimitEnv('BREVO_EMAIL_LIMIT_MONTHLY', 9_000)
      ),
      backendApiEventsMonthly: parseLimitValue(
        monitoringConfig?.limits?.backendApiEventsMonthly,
        parseLimitEnv('BACKEND_API_EVENTS_LIMIT_MONTHLY', 500_000)
      ),
    };

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
      },
      monitoring: (() => {
        const mongoUsageGb = Number(dbStats?.dataSize || 0) / (1024 * 1024 * 1024);
        const mongoLimitGb = monitoringLimits.mongodbStorageGb;

        const vercelSnapshot = snapshotMap.get('vercel:requests.monthly');
        const cloudRunSnapshot = snapshotMap.get('cloud_run:requests.monthly');
        const clerkSnapshot = snapshotMap.get('clerk:mau.monthly');
        const brevoSnapshot = snapshotMap.get('brevo:emails.monthly');

        const providers: ProviderUsageMetric[] = [
          buildUsageMetric({
            key: 'mongodb',
            name: 'MongoDB Storage',
            configured: Boolean(process.env.MONGODB_URI),
            usage: mongoUsageGb,
            limit: mongoLimitGb,
            unit: 'GB',
            source: 'live',
            updatedAt: new Date(),
            dayProgress,
          }),
          buildUsageMetric({
            key: 'vercel',
            name: 'Vercel Requests',
            configured: configuredProviders.vercel,
            usage: Number(vercelSnapshot?.value || 0),
            limit: monitoringLimits.vercelRequestsMonthly,
            unit: 'requests/month',
            source: vercelSnapshot ? 'snapshot' : 'estimated',
            updatedAt: vercelSnapshot?.createdAt || new Date(),
            dayProgress,
          }),
          buildUsageMetric({
            key: 'cloud_run',
            name: 'Cloud Run Requests',
            configured: configuredProviders.cloudRun,
            usage: Number(cloudRunSnapshot?.value || 0),
            limit: monitoringLimits.cloudRunRequestsMonthly,
            unit: 'requests/month',
            source: cloudRunSnapshot ? 'snapshot' : 'estimated',
            updatedAt: cloudRunSnapshot?.createdAt || new Date(),
            dayProgress,
          }),
          buildUsageMetric({
            key: 'clerk',
            name: 'Clerk Monthly Active Users',
            configured: configuredProviders.clerk,
            usage: Number(clerkSnapshot?.value || newUsersThisMonth),
            limit: monitoringLimits.clerkMauMonthly,
            unit: 'mau/month',
            source: clerkSnapshot ? 'snapshot' : 'estimated',
            updatedAt: clerkSnapshot?.createdAt || new Date(),
            dayProgress,
          }),
          buildUsageMetric({
            key: 'brevo',
            name: 'Brevo Email Sends',
            configured: configuredProviders.brevo,
            usage: Number(brevoSnapshot?.value || 0),
            limit: monitoringLimits.brevoEmailsMonthly,
            unit: 'emails/month',
            source: brevoSnapshot ? 'snapshot' : 'estimated',
            updatedAt: brevoSnapshot?.createdAt || new Date(),
            dayProgress,
          }),
          buildUsageMetric({
            key: 'backend_api',
            name: 'LoanPro Backend API Events',
            configured: true,
            usage: Number(backendApiEventsThisMonth || 0),
            limit: monitoringLimits.backendApiEventsMonthly,
            unit: 'events/month',
            source: 'live',
            updatedAt: new Date(),
            dayProgress,
          }),
        ];

        const sortedByRisk = [...providers]
          .sort((a, b) => b.projectedUtilizationPct - a.projectedUtilizationPct)
          .map((provider) => ({
            key: provider.key,
            name: provider.name,
            projectedUtilizationPct: provider.projectedUtilizationPct,
            projectedLevel: usageLevel(provider.projectedUtilizationPct),
            headroom: provider.headroom,
          }));

        const actionItems = sortedByRisk
          .filter((provider) => provider.projectedUtilizationPct >= 70)
          .slice(0, 4)
          .map((provider) => {
            if (provider.projectedUtilizationPct >= 90) {
              return `Immediate action: raise ${provider.name} limit or reduce throughput.`;
            }
            return `Plan upgrade review for ${provider.name}; projected utilization is high.`;
          });

        return {
          generatedAt: new Date().toISOString(),
          providers,
          summary: {
            critical: providers.filter((p) => p.level === 'critical').length,
            warning: providers.filter((p) => p.level === 'warning').length,
            ok: providers.filter((p) => p.level === 'ok').length,
          },
          report: {
            monthProgressPct: Math.round(dayProgress * 10000) / 100,
            averageFreshnessHours: providers.length
              ? Math.round((providers.reduce((sum, provider) => sum + provider.freshnessHours, 0) / providers.length) * 100) / 100
              : 0,
            highestProjectedUtilizationPct: sortedByRisk[0]?.projectedUtilizationPct || 0,
            topRisks: sortedByRisk.slice(0, 3),
            actionItems,
          },
        };
      })(),
      limits: {
        note: 'Limits are loaded from Admin Settings monitoring configuration first, with env vars as fallback.'
      }
    };

    setAdminCachedResponse(cacheKey, payload, 25_000, ['dashboard', 'analytics', 'payments', 'subscriptions', 'users']);

    return new Response(JSON.stringify(payload), { status: 200 });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), { status: getAdminErrorStatus(error) });
  }
}
