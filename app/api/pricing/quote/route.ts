import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getEffectivePlanPricing, normalizePlanName } from '@/lib/planConfig';
import { buildPricingSummary, calculatePlanAmountRupees, type BillingPeriod, type PaidPlanName } from '@/lib/pricing';
import { getCouponQuote } from '@/lib/couponUtils';

function isBillingPeriod(value: string): value is BillingPeriod {
  return value === 'monthly' || value === 'annually';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedPlan = String(searchParams.get('plan') || '').trim();
    const requestedBillingPeriod = String(searchParams.get('billingPeriod') || 'monthly').trim().toLowerCase();
    const billingPeriod: BillingPeriod = isBillingPeriod(requestedBillingPeriod) ? requestedBillingPeriod : 'monthly';
    const couponCode = String(searchParams.get('couponCode') || '').trim();

    const { db } = await connectToDatabase();
    const pricing = await getEffectivePlanPricing(db);
    const plans = buildPricingSummary(pricing as Record<PaidPlanName, number>);

    let quote: Record<string, unknown> | null = null;
    if (requestedPlan) {
      const normalizedPlan = normalizePlanName(requestedPlan);
      if (normalizedPlan === 'trial') {
        quote = {
          plan: 'trial',
          billingPeriod,
          subtotal: 0,
          discountAmount: 0,
          total: 0,
          coupon: null,
        };
      } else {
        const monthlyPrice = Number((pricing as Record<PaidPlanName, number>)[normalizedPlan] || 0);
        const subtotal = calculatePlanAmountRupees(monthlyPrice, billingPeriod);
        const couponQuote = await getCouponQuote(db, {
          couponCode,
          plan: normalizedPlan,
          billingPeriod,
          subtotal,
        });

        quote = {
          plan: normalizedPlan,
          billingPeriod,
          monthlyPrice,
          subtotal,
          discountAmount: couponQuote.discountAmount,
          total: couponQuote.totalAmount,
          coupon: couponQuote.coupon,
          couponStatus: {
            requestedCode: couponQuote.requestedCode,
            applied: couponQuote.applied,
            reason: couponQuote.reason,
            message: couponQuote.message,
          },
        };
      }
    }

    return NextResponse.json({
      success: true,
      plans,
      annualDiscountPercent: 15,
      quote,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch pricing quote' },
      { status: 500 }
    );
  }
}