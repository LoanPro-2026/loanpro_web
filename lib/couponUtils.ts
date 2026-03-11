import type { Db } from 'mongodb';
import type { BillingPeriod } from '@/lib/pricing';

interface CouponDocument {
  code?: string;
  discountType?: 'percentage' | 'flat' | string;
  discountValue?: number;
  maxUses?: number;
  usedCount?: number;
  active?: boolean;
  expiresAt?: Date | string | null;
  applicablePlans?: string[];
  applicableBillingPeriods?: string[];
  minimumAmount?: number;
}

export interface CouponQuoteResult {
  requestedCode: string | null;
  applied: boolean;
  reason: string | null;
  message: string | null;
  discountAmount: number;
  totalAmount: number;
  coupon: null | {
    code: string;
    discountType: 'percentage' | 'flat';
    discountValue: number;
  };
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((value) => value.toLowerCase());
}

function isCouponExpired(expiresAt: CouponDocument['expiresAt']): boolean {
  if (!expiresAt) return false;
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function validateCouponEligibility(coupon: CouponDocument, plan: string, billingPeriod: BillingPeriod, subtotal: number): CouponQuoteResult | null {
  if (!coupon.active) {
    return {
      requestedCode: String(coupon.code || '').toUpperCase() || null,
      applied: false,
      reason: 'inactive',
      message: 'This coupon is currently inactive.',
      discountAmount: 0,
      totalAmount: subtotal,
      coupon: null,
    };
  }

  if (isCouponExpired(coupon.expiresAt)) {
    return {
      requestedCode: String(coupon.code || '').toUpperCase() || null,
      applied: false,
      reason: 'expired',
      message: 'This coupon has expired.',
      discountAmount: 0,
      totalAmount: subtotal,
      coupon: null,
    };
  }

  const maxUses = Number.isFinite(coupon.maxUses) ? Number(coupon.maxUses) : 0;
  const usedCount = Number.isFinite(coupon.usedCount) ? Number(coupon.usedCount) : 0;
  if (maxUses > 0 && usedCount >= maxUses) {
    return {
      requestedCode: String(coupon.code || '').toUpperCase() || null,
      applied: false,
      reason: 'usage_limit_reached',
      message: 'This coupon has already reached its usage limit.',
      discountAmount: 0,
      totalAmount: subtotal,
      coupon: null,
    };
  }

  const applicablePlans = normalizeStringArray(coupon.applicablePlans);
  if (applicablePlans.length > 0 && !applicablePlans.includes(String(plan || '').trim().toLowerCase())) {
    return {
      requestedCode: String(coupon.code || '').toUpperCase() || null,
      applied: false,
      reason: 'plan_not_allowed',
      message: 'This coupon is not valid for the selected plan.',
      discountAmount: 0,
      totalAmount: subtotal,
      coupon: null,
    };
  }

  const applicableBillingPeriods = normalizeStringArray(coupon.applicableBillingPeriods);
  if (applicableBillingPeriods.length > 0 && !applicableBillingPeriods.includes(billingPeriod)) {
    return {
      requestedCode: String(coupon.code || '').toUpperCase() || null,
      applied: false,
      reason: 'billing_period_not_allowed',
      message: 'This coupon is not valid for the selected billing period.',
      discountAmount: 0,
      totalAmount: subtotal,
      coupon: null,
    };
  }

  const minimumAmount = Number.isFinite(coupon.minimumAmount) ? Number(coupon.minimumAmount) : 0;
  if (minimumAmount > 0 && subtotal < minimumAmount) {
    return {
      requestedCode: String(coupon.code || '').toUpperCase() || null,
      applied: false,
      reason: 'minimum_amount_not_met',
      message: `This coupon requires a minimum subtotal of Rs. ${minimumAmount}.`,
      discountAmount: 0,
      totalAmount: subtotal,
      coupon: null,
    };
  }

  return null;
}

export async function getCouponQuote(
  db: Db,
  params: { couponCode?: string | null; plan: string; billingPeriod: BillingPeriod; subtotal: number }
): Promise<CouponQuoteResult> {
  const requestedCode = String(params.couponCode || '').trim().toUpperCase();
  const subtotal = Number.isFinite(params.subtotal) ? Math.max(0, Math.round(params.subtotal)) : 0;

  if (!requestedCode) {
    return {
      requestedCode: null,
      applied: false,
      reason: null,
      message: null,
      discountAmount: 0,
      totalAmount: subtotal,
      coupon: null,
    };
  }

  const coupon = (await db.collection('coupons').findOne({ code: requestedCode })) as CouponDocument | null;
  if (!coupon) {
    return {
      requestedCode,
      applied: false,
      reason: 'not_found',
      message: 'Coupon code not found.',
      discountAmount: 0,
      totalAmount: subtotal,
      coupon: null,
    };
  }

  const eligibilityFailure = validateCouponEligibility(coupon, params.plan, params.billingPeriod, subtotal);
  if (eligibilityFailure) {
    return eligibilityFailure;
  }

  const discountType = coupon.discountType === 'flat' ? 'flat' : 'percentage';
  const discountValue = Number.isFinite(coupon.discountValue) ? Math.max(0, Number(coupon.discountValue)) : 0;
  if (discountValue <= 0) {
    return {
      requestedCode,
      applied: false,
      reason: 'invalid_discount',
      message: 'Coupon discount is invalid.',
      discountAmount: 0,
      totalAmount: subtotal,
      coupon: null,
    };
  }

  const rawDiscountAmount = discountType === 'percentage'
    ? Math.round((subtotal * discountValue) / 100)
    : Math.round(discountValue);
  const discountAmount = Math.min(subtotal, Math.max(0, rawDiscountAmount));

  return {
    requestedCode,
    applied: discountAmount > 0,
    reason: discountAmount > 0 ? null : 'zero_discount',
    message: discountAmount > 0 ? null : 'Coupon did not reduce the subtotal.',
    discountAmount,
    totalAmount: Math.max(0, subtotal - discountAmount),
    coupon: discountAmount > 0
      ? {
          code: requestedCode,
          discountType,
          discountValue,
        }
      : null,
  };
}