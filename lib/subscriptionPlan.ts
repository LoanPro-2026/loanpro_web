import { Db } from 'mongodb';

export type SupportedPlan = 'basic' | 'pro' | 'enterprise' | 'trial';

export function normalizePlan(input?: string | null): SupportedPlan {
  const value = String(input || '').trim().toLowerCase();
  if (value === 'pro') return 'pro';
  if (value === 'enterprise') return 'enterprise';
  if (value === 'trial') return 'trial';
  return 'basic';
}

export function getDeviceLimitForPlan(plan: SupportedPlan): number {
  if (plan === 'enterprise') return 5;
  return 1;
}

/**
 * Resolve the effective plan from the latest active/trial subscription.
 * Falls back to legacy user fields for backward compatibility.
 */
export async function resolveEffectivePlanForUser(db: Db, user: any): Promise<SupportedPlan> {
  const activeSubscription = await db.collection('subscriptions').findOne(
    {
      userId: user.userId,
      status: { $in: ['active', 'trial', 'active_subscription'] },
      endDate: { $gt: new Date() },
    },
    { sort: { endDate: -1, createdAt: -1 } }
  );

  if (activeSubscription) {
    return normalizePlan(activeSubscription.plan || activeSubscription.subscriptionPlan || activeSubscription.subscriptionType);
  }

  return normalizePlan(user.subscriptionPlan || user.plan);
}
