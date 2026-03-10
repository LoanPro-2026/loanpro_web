/**
 * Subscription Status Constants
 * Single source of truth for subscription.status field
 */
export const SubscriptionStatus = {
  /**
   * Active paid subscription
   * User has full access to features
   */
  ACTIVE: 'active',
  
  /**
   * Free trial period
   * User has Pro/trial features temporarily
   */
  TRIAL: 'trial',
  
  /**
   * Trial converted to paid subscription
   * Historical record, not used for access control
   */
  COMPLETED: 'completed',
  
  /**
   * Old subscription replaced by upgrade/renewal
   * Historical record only, should not appear in active queries
   */
  SUPERSEDED: 'superseded',
  
  /**
   * Subscription past end date, in grace period
    * Grace window before forced sign-out/deprovision (15 days)
   */
  EXPIRED: 'expired',
  
  /**
   * User canceled subscription, no renewal
   * Marked for deletion after grace period
   */
  CANCELED: 'canceled',
  
  /**
   * Admin deactivated subscription
   * User loses access immediately
   */
  INACTIVE: 'inactive'
} as const;

export type SubscriptionStatusType = typeof SubscriptionStatus[keyof typeof SubscriptionStatus];

/**
 * Check if subscription allows full access
 * @param status - Subscription status string
 * @returns true if user has active access (active or trial)
 */
export function hasActiveAccess(status: string): boolean {
  return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL;
}

/**
 * Check if subscription is historical (for filtering payment history)
 * Historical subscriptions should not appear in user-facing lists
 * @param status - Subscription status string
 * @returns true if status is completed or superseded
 */
export function isHistoricalStatus(status: string): boolean {
  return status === SubscriptionStatus.COMPLETED || status === SubscriptionStatus.SUPERSEDED;
}

/**
 * Get user-friendly status label for UI display
 * @param status - Subscription status string
 * @returns Formatted status label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [SubscriptionStatus.ACTIVE]: 'Active',
    [SubscriptionStatus.TRIAL]: 'Trial',
    [SubscriptionStatus.COMPLETED]: 'Completed',
    [SubscriptionStatus.SUPERSEDED]: 'Superseded',
    [SubscriptionStatus.EXPIRED]: 'Expired',
    [SubscriptionStatus.CANCELED]: 'Canceled',
    [SubscriptionStatus.INACTIVE]: 'Inactive'
  };
  
  return labels[status] || 'Unknown';
}

/**
 * Get status color class for UI display (Tailwind)
 * @param status - Subscription status string
 * @returns Tailwind color classes
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
    [SubscriptionStatus.TRIAL]: 'bg-blue-100 text-blue-800 border-blue-200',
    [SubscriptionStatus.COMPLETED]: 'bg-slate-100 text-slate-600 border-slate-200',
    [SubscriptionStatus.SUPERSEDED]: 'bg-slate-100 text-slate-600 border-slate-200',
    [SubscriptionStatus.EXPIRED]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [SubscriptionStatus.CANCELED]: 'bg-red-100 text-red-800 border-red-200',
    [SubscriptionStatus.INACTIVE]: 'bg-slate-100 text-slate-600 border-slate-200'
  };
  
  return colors[status] || 'bg-slate-100 text-slate-600 border-slate-200';
}
