import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, invalidateAdminCacheByTags, setAdminCachedResponse } from '@/lib/adminResponseCache';
import { writeAdminAuditLog } from '@/lib/adminAudit';

const ALLOWED_PLANS = ['basic', 'pro', 'enterprise', 'trial'];
const ALLOWED_BILLING_PERIODS = ['monthly', 'annually'];
const ALLOWED_STATUSES = ['active', 'trial', 'cancelled', 'expired', 'superseded', 'active_subscription'];

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePlan(plan: string): string {
  const p = plan.toLowerCase();
  if (p === 'pro') return 'Pro';
  if (p === 'enterprise') return 'Enterprise';
  if (p === 'trial') return 'trial';
  return 'Basic';
}

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'subscriptions:read',
      rateLimitKey: 'subscriptions:get',
      limit: 80,
      windowMs: 60_000,
    });

    const { searchParams } = new URL(request.url);
    const search = normalizeText(searchParams.get('search'));
    const status = normalizeText(searchParams.get('status')).toLowerCase();
    const plan = normalizeText(searchParams.get('plan')).toLowerCase();

    const cacheKey = `admin:subscriptions:list:v2:${search}:${status}:${plan}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    const match: Record<string, unknown> = {};
    if (status && ALLOWED_STATUSES.includes(status)) {
      match.status = status;
    }
    if (plan && ALLOWED_PLANS.includes(plan)) {
      match.plan = normalizePlan(plan);
    }

    // Get subscriptions with user info
    const subscriptions = await db.collection('subscriptions')
      .aggregate<any>([
        { $match: match },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: 'userId',
            as: 'user'
          }
        },
        {
          $match: search
            ? {
                $or: [
                  { userId: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
                  { userName: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
                  { userEmail: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
                  { plan: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
                ],
              }
            : {},
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
              paymentId: 1,
              updatedAt: 1,
              gracePeriodEndsAt: 1,
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

export async function POST(request: Request) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'subscriptions:write',
      rateLimitKey: 'subscriptions:create:post',
      limit: 30,
      windowMs: 60_000,
    });

    const body = await request.json();
    const userId = normalizeText(body?.userId);
    const rawPlan = normalizeText(body?.plan);
    const rawStatus = normalizeText(body?.status).toLowerCase() || 'active';
    const billingPeriod = normalizeText(body?.billingPeriod).toLowerCase() || 'monthly';
    const startDate = body?.startDate ? new Date(body.startDate) : new Date();
    const endDate = body?.endDate ? new Date(body.endDate) : null;

    if (!userId || !rawPlan) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId and plan are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!ALLOWED_PLANS.includes(rawPlan.toLowerCase())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid plan' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!ALLOWED_BILLING_PERIODS.includes(billingPeriod)) {
      return new Response(
        JSON.stringify({ success: false, error: 'billingPeriod must be monthly or annually' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!ALLOWED_STATUSES.includes(rawStatus)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (Number.isNaN(startDate.getTime())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid startDate' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const computedEndDate = endDate && !Number.isNaN(endDate.getTime())
      ? endDate
      : (() => {
          const date = new Date(startDate);
          if (billingPeriod === 'annually') date.setFullYear(date.getFullYear() + 1);
          else date.setMonth(date.getMonth() + 1);
          return date;
        })();

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ userId });
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found for userId' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const normalizedPlan = normalizePlan(rawPlan);
    const replaceExistingActive = body?.replaceExistingActive !== false;

    if (replaceExistingActive && ['active', 'trial', 'active_subscription'].includes(rawStatus)) {
      await db.collection('subscriptions').updateMany(
        {
          userId,
          status: { $in: ['active', 'trial', 'active_subscription'] },
        },
        {
          $set: {
            status: 'superseded',
            supersededAt: now,
            supersededByAdmin: admin.email,
            updatedAt: now,
          },
        }
      );
    }

    const subscription = {
      userId,
      plan: normalizedPlan,
      billingPeriod,
      status: rawStatus,
      startDate,
      endDate: computedEndDate,
      gracePeriodEndsAt: new Date(computedEndDate.getTime() + 15 * 24 * 60 * 60 * 1000),
      amount: Number.isFinite(Number(body?.amount)) ? Number(body.amount) : 0,
      paymentId: normalizeText(body?.paymentId) || null,
      createdAt: now,
      updatedAt: now,
      createdByAdmin: admin.email,
      source: 'admin_panel',
    };

    const result = await db.collection('subscriptions').insertOne(subscription);

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'subscriptions.create',
      targetType: 'subscription',
      targetId: result.insertedId.toString(),
      details: {
        userId,
        plan: subscription.plan,
        status: subscription.status,
        billingPeriod,
        replaceExistingActive,
      },
    });

    invalidateAdminCacheByTags(['subscriptions', 'users', 'dashboard', 'analytics']);

    return new Response(
      JSON.stringify({ success: true, subscription: { ...subscription, _id: result.insertedId } }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create subscription' }),
      { status: getAdminErrorStatus(error), headers: { 'Content-Type': 'application/json' } }
    );
  }
}
