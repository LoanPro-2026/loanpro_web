import { Db } from 'mongodb';
import { getPlanFeatures } from './planFeatures';

export interface EnrichedSubscription {
  _id: any;
  userId: string;
  plan: string;
  billingPeriod: string;
  startDate: Date;
  endDate: Date;
  gracePeriodEndsAt: Date;
  status: string;
  paymentId?: string;
  isUpgraded?: boolean;
  isRenewal?: boolean;
  // Enriched fields (derived)
  features: any;
  maxDevices: number;
  cloudStorageGB: number;
  daysRemaining?: number;
  isActive?: boolean;
  isInGracePeriod?: boolean;
}

/**
 * Get active subscription for a user
 * Returns the most recent active or trial subscription
 */
export async function getActiveSubscription(
  userId: string,
  db: Db
): Promise<any | null> {
  return await db.collection('subscriptions').findOne(
    {
      userId,
      status: { $in: ['active', 'trial'] },
      endDate: { $gt: new Date() },
    },
    {
      sort: { createdAt: -1 },
    }
  );
}

/**
 * Get user with their active subscription (enriched with features)
 */
export async function getUserWithSubscription(
  userId: string,
  db: Db
): Promise<{
  user: any | null;
  subscription: EnrichedSubscription | null;
}> {
  const user = await db.collection('users').findOne({ userId });
  const subscription = await getActiveSubscription(userId, db);

  if (!user) {
    return { user: null, subscription: null };
  }

  if (!subscription) {
    return { user, subscription: null };
  }

  // Enrich subscription with plan features
  const planFeatures = getPlanFeatures(subscription.plan);
  const now = new Date();
  const endDate = new Date(subscription.endDate);
  const gracePeriodEndsAt = new Date(subscription.gracePeriodEndsAt);

  const isActive = endDate > now;
  const isInGracePeriod = !isActive && gracePeriodEndsAt > now;
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    user,
    subscription: {
      ...subscription,
      features: planFeatures.features,
      maxDevices: planFeatures.maxDevices,
      cloudStorageGB: planFeatures.cloudStorageGB,
      daysRemaining,
      isActive,
      isInGracePeriod,
    },
  };
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(
  userId: string,
  db: Db
): Promise<boolean> {
  const subscription = await getActiveSubscription(userId, db);
  return subscription !== null;
}

/**
 * Get subscription status (active, grace_period, or expired)
 */
export function getSubscriptionStatus(subscription: EnrichedSubscription): string {
  const now = new Date();
  const endDate = new Date(subscription.endDate);
  const gracePeriodEndsAt = new Date(subscription.gracePeriodEndsAt);

  if (endDate > now) {
    return subscription.status === 'trial' ? 'active_trial' : 'active_subscription';
  } else if (gracePeriodEndsAt > now) {
    return 'grace_period';
  } else {
    return 'expired';
  }
}
