import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { invalidateAdminCacheByTags } from '@/lib/adminResponseCache';
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

function parseObjectId(rawId: string) {
  if (!ObjectId.isValid(rawId)) {
    throw new Error('Invalid subscription ID');
  }

  return new ObjectId(rawId);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function revokeUserAccessIfNoActiveSubscription(db: any, userId: string) {
  const activeCount = await db.collection('subscriptions').countDocuments({
    userId,
    status: { $in: ['active', 'trial', 'active_subscription'] },
  });

  if (activeCount === 0) {
    await db.collection('users').updateOne(
      { userId },
      {
        $set: {
          accessToken: null,
          status: 'cancelled_subscription',
          cancelledDate: new Date(),
        },
      }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    await enforceAdminAccess(request, {
      permission: 'subscriptions:read',
      rateLimitKey: 'subscriptions:item:get',
      limit: 100,
      windowMs: 60_000,
    });

    const { subscriptionId } = await params;
    const dbId = parseObjectId(subscriptionId);
    const { db } = await connectToDatabase();

    const subscription = await db.collection('subscriptions').findOne({ _id: dbId });
    if (!subscription) {
      return json({ success: false, error: 'Subscription not found' }, 404);
    }

    const user = await db.collection('users').findOne(
      { userId: subscription.userId },
      { projection: { userId: 1, username: 1, email: 1, fullName: 1, _id: 1 } }
    );

    return json({ success: true, subscription: { ...subscription, user } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    const status = message === 'Invalid subscription ID' ? 400 : getAdminErrorStatus(error);
    return json({ success: false, error: message }, status);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'subscriptions:write',
      rateLimitKey: 'subscriptions:item:patch',
      limit: 40,
      windowMs: 60_000,
    });

    const { subscriptionId } = await params;
    const dbId = parseObjectId(subscriptionId);
    const body = await request.json();

    const patch: Record<string, unknown> = {};

    if (body?.plan !== undefined) {
      const plan = normalizeText(body.plan);
      if (!ALLOWED_PLANS.includes(plan.toLowerCase())) {
        return json({ success: false, error: 'Invalid plan' }, 400);
      }
      patch.plan = normalizePlan(plan);
    }

    if (body?.billingPeriod !== undefined) {
      const billingPeriod = normalizeText(body.billingPeriod).toLowerCase();
      if (!ALLOWED_BILLING_PERIODS.includes(billingPeriod)) {
        return json({ success: false, error: 'billingPeriod must be monthly or annually' }, 400);
      }
      patch.billingPeriod = billingPeriod;
    }

    if (body?.status !== undefined) {
      const status = normalizeText(body.status).toLowerCase();
      if (!ALLOWED_STATUSES.includes(status)) {
        return json({ success: false, error: 'Invalid status' }, 400);
      }
      patch.status = status;
    }

    if (body?.userId !== undefined) {
      const userId = normalizeText(body.userId);
      if (!userId) {
        return json({ success: false, error: 'userId cannot be empty' }, 400);
      }
      patch.userId = userId;
    }

    const numericFields = ['amount'];
    for (const field of numericFields) {
      if (body?.[field] !== undefined) {
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) {
          return json({ success: false, error: `${field} must be a non-negative number` }, 400);
        }
        patch[field] = value;
      }
    }

    const dateFields = ['startDate', 'endDate', 'gracePeriodEndsAt'];
    for (const field of dateFields) {
      if (body?.[field] !== undefined) {
        const value = body[field] ? new Date(body[field]) : null;
        if (value && Number.isNaN(value.getTime())) {
          return json({ success: false, error: `Invalid ${field}` }, 400);
        }
        patch[field] = value;
      }
    }

    if (body?.paymentId !== undefined) {
      patch.paymentId = normalizeText(body.paymentId) || null;
    }

    if (Object.keys(patch).length === 0) {
      return json({ success: false, error: 'No updatable fields provided' }, 400);
    }

    const { db } = await connectToDatabase();
    const existing = await db.collection('subscriptions').findOne({ _id: dbId });
    if (!existing) {
      return json({ success: false, error: 'Subscription not found' }, 404);
    }

    if (patch.userId) {
      const userExists = await db.collection('users').findOne({ userId: patch.userId });
      if (!userExists) {
        return json({ success: false, error: 'Target userId does not exist' }, 404);
      }
    }

    const now = new Date();
    patch.updatedAt = now;
    await db.collection('subscriptions').updateOne({ _id: dbId }, { $set: patch });

    const nextStatus = typeof patch.status === 'string' ? patch.status : existing.status;
    const nextUserId = typeof patch.userId === 'string' ? patch.userId : existing.userId;
    if (['active', 'trial', 'active_subscription'].includes(String(nextStatus).toLowerCase())) {
      await db.collection('subscriptions').updateMany(
        {
          _id: { $ne: dbId },
          userId: nextUserId,
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

    if (['cancelled', 'expired', 'superseded'].includes(String(nextStatus).toLowerCase())) {
      await revokeUserAccessIfNoActiveSubscription(db, String(nextUserId));
    }

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'subscriptions.update',
      targetType: 'subscription',
      targetId: subscriptionId,
      details: patch,
    });

    invalidateAdminCacheByTags(['subscriptions', 'users', 'dashboard', 'analytics']);

    const updated = await db.collection('subscriptions').findOne({ _id: dbId });
    return json({ success: true, subscription: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update subscription';
    const status = message === 'Invalid subscription ID' ? 400 : getAdminErrorStatus(error);
    return json({ success: false, error: message }, status);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'subscriptions:write',
      rateLimitKey: 'subscriptions:item:delete',
      limit: 25,
      windowMs: 60_000,
    });

    const { subscriptionId } = await params;
    const dbId = parseObjectId(subscriptionId);
    const { db } = await connectToDatabase();

    const existing = await db.collection('subscriptions').findOne({ _id: dbId });
    if (!existing) {
      return json({ success: false, error: 'Subscription not found' }, 404);
    }

    await db.collection('subscriptions').deleteOne({ _id: dbId });

    await revokeUserAccessIfNoActiveSubscription(db, String(existing.userId));

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'subscriptions.delete',
      targetType: 'subscription',
      targetId: subscriptionId,
      details: {
        userId: existing.userId,
        plan: existing.plan,
        status: existing.status,
      },
    });

    invalidateAdminCacheByTags(['subscriptions', 'users', 'dashboard', 'analytics']);

    return json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete subscription';
    const status = message === 'Invalid subscription ID' ? 400 : getAdminErrorStatus(error);
    return json({ success: false, error: message }, status);
  }
}
