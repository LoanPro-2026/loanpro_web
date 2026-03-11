export type PaidPlanName = 'Basic' | 'Pro' | 'Enterprise';
export type BillingPeriod = 'monthly' | 'annually';

export const ANNUAL_DISCOUNT_MULTIPLIER = 0.85;

export function calculatePlanAmountRupees(monthlyPrice: number, billingPeriod: BillingPeriod): number {
  const normalizedMonthlyPrice = Number.isFinite(monthlyPrice) ? Math.max(0, Math.round(monthlyPrice)) : 0;
  if (billingPeriod === 'annually') {
    return Math.round(normalizedMonthlyPrice * 12 * ANNUAL_DISCOUNT_MULTIPLIER);
  }

  return normalizedMonthlyPrice;
}

export function calculatePlanAmountPaise(monthlyPrice: number, billingPeriod: BillingPeriod): number {
  return calculatePlanAmountRupees(monthlyPrice, billingPeriod) * 100;
}

export function buildPricingSummary(pricing: Record<PaidPlanName, number>) {
  return {
    Basic: {
      monthly: calculatePlanAmountRupees(pricing.Basic, 'monthly'),
      annually: calculatePlanAmountRupees(pricing.Basic, 'annually'),
      monthlyBase: Math.round(pricing.Basic),
    },
    Pro: {
      monthly: calculatePlanAmountRupees(pricing.Pro, 'monthly'),
      annually: calculatePlanAmountRupees(pricing.Pro, 'annually'),
      monthlyBase: Math.round(pricing.Pro),
    },
    Enterprise: {
      monthly: calculatePlanAmountRupees(pricing.Enterprise, 'monthly'),
      annually: calculatePlanAmountRupees(pricing.Enterprise, 'annually'),
      monthlyBase: Math.round(pricing.Enterprise),
    },
  };
}