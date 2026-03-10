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
  const now = new Date();
  return await db.collection('subscriptions').findOne(
    {
      userId,
      status: { $nin: ['superseded'] },
      $or: [
        { endDate: { $gt: now } },
        { gracePeriodEndsAt: { $gt: now } },
      ],
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

/**
 * Get subscription end date from any field variant
 * Handles legacy field names: endDate, subscriptionExpiresAt, expiryDate
 * This ensures backward compatibility with different field naming conventions
 * 
 * @param subscription - Subscription object with potentially different date field names
 * @returns Date object representing when subscription ends
 * @throws Error if no end date field is found
 */
export function getSubscriptionEndDate(subscription: any): Date {
  const endDateValue = subscription.endDate || 
                       subscription.subscriptionExpiresAt || 
                       subscription.expiryDate;
  
  if (!endDateValue) {
    throw new Error('No end date found in subscription object');
  }
  
  return new Date(endDateValue);
}

/**
 * Get billing period in consistent format
 * Converts between different naming conventions:
 * - subscriptionType ('monthly'|'yearly') → billingPeriod ('monthly'|'annually')
 * - billingPeriod ('monthly'|'annually') → kept as is
 * 
 * @param subscription - Subscription object with billing period info
 * @returns Consistent billing period format: 'monthly' | 'annually'
 */
export function getBillingPeriod(subscription: any): 'monthly' | 'annually' {
  // If billingPeriod exists, use it
  if (subscription.billingPeriod) {
    return subscription.billingPeriod === 'annually' ? 'annually' : 'monthly';
  }
  
  // Fallback to subscriptionType (from SubscriptionService)
  if (subscription.subscriptionType) {
    return subscription.subscriptionType === 'yearly' ? 'annually' : 'monthly';
  }
  
  // Default to monthly if nothing found
  return 'monthly';
}

/**
 * Normalize subscription type for SubscriptionService compatibility
 * Converts billing period to subscription type format
 * 
 * @param billingPeriod - 'monthly' | 'annually'
 * @returns 'monthly' | '6months' | 'yearly'
 */
export function normalizeSubscriptionType(billingPeriod: 'monthly' | 'annually'): 'monthly' | '6months' | 'yearly' {
  const map: Record<string, 'monthly' | '6months' | 'yearly'> = {
    'monthly': 'monthly',
    'annually': 'yearly'
  };
  
  return map[billingPeriod] || 'monthly';
}
