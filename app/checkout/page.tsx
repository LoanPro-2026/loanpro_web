'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ArrowLeftIcon, CheckIcon, TagIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/components/ToastProvider';
import { trackEvent } from '@/lib/googleAnalytics';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type BillingPeriod = 'monthly' | 'annually';
type CheckoutContext = 'new' | 'renewal';

interface QuoteResponse {
  quote?: {
    plan: string;
    billingPeriod: BillingPeriod;
    monthlyPrice?: number;
    subtotal: number;
    discountAmount: number;
    total: number;
    coupon?: {
      code: string;
      discountType: 'percentage' | 'flat';
      discountValue: number;
    } | null;
    couponStatus?: {
      applied?: boolean;
      message?: string | null;
      reason?: string | null;
    };
  } | null;
}

const PLAN_COPY: Record<string, { title: string; description: string }> = {
  Basic: {
    title: 'Basic',
    description: 'Core loan operations for daily work.',
  },
  Pro: {
    title: 'Pro',
    description: 'Cloud backup, sync, and stronger operational reliability.',
  },
  Enterprise: {
    title: 'Enterprise',
    description: 'Pro capabilities with controlled multi-device access.',
  },
};

function formatINR(amount: number) {
  return amount.toLocaleString('en-IN');
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { showToast } = useToast();

  const initialPlan = searchParams.get('plan') || 'Pro';
  const initialBillingPeriod = searchParams.get('billingPeriod') === 'annually' ? 'annually' : 'monthly';
  const checkoutContext: CheckoutContext = searchParams.get('context') === 'renewal' ? 'renewal' : 'new';

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [quote, setQuote] = useState<QuoteResponse['quote']>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const plan = useMemo(() => (PLAN_COPY[initialPlan] ? initialPlan : 'Pro'), [initialPlan]);
  const billingPeriod: BillingPeriod = initialBillingPeriod;
  const planCopy = PLAN_COPY[plan];

  useEffect(() => {
    let disposed = false;

    const fetchQuote = async () => {
      try {
        setLoadingQuote(true);
        const query = new URLSearchParams({ plan, billingPeriod });
        if (appliedCoupon) {
          query.set('couponCode', appliedCoupon);
        }

        const response = await fetch(`/api/pricing/quote?${query.toString()}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (!disposed) {
          setQuote(data.quote || null);
        }
      } catch (error) {
        if (!disposed) {
          setQuote(null);
          showToast(error instanceof Error ? error.message : 'Failed to load checkout pricing', 'error');
        }
      } finally {
        if (!disposed) {
          setLoadingQuote(false);
        }
      }
    };

    void fetchQuote();
    return () => {
      disposed = true;
    };
  }, [plan, billingPeriod, appliedCoupon, showToast]);

  useEffect(() => {
    trackEvent('view_checkout', {
      plan,
      billing_period: billingPeriod,
      checkout_context: checkoutContext,
    });
  }, [plan, billingPeriod, checkoutContext]);

  const handleApplyCoupon = () => {
    setAppliedCoupon(couponInput.trim().toUpperCase());
  };

  const handleClearCoupon = () => {
    setCouponInput('');
    setAppliedCoupon('');
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);
      trackEvent('add_payment_info', {
        plan,
        billing_period: billingPeriod,
        checkout_context: checkoutContext,
        coupon_code: appliedCoupon || undefined,
      });

      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan,
          billingPeriod,
          couponCode: appliedCoupon || undefined,
          paymentContext: checkoutContext,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to create payment order');
      }

      const orderData = data.data || data;
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'LoanPro',
        description: `${checkoutContext === 'renewal' ? 'Renew' : 'Purchase'} ${plan} subscription`,
        order_id: orderData.orderId,
        handler: async (paymentResponse: any) => {
          try {
            const verificationResponse = await fetch('/api/payment-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                userId: user?.id || user?.primaryEmailAddress?.emailAddress,
                email: user?.primaryEmailAddress?.emailAddress || '',
                fullName: user?.fullName || '',
                username: user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress,
                plan,
                billingPeriod,
                isRenewal: checkoutContext === 'renewal',
              }),
            });

            if (!verificationResponse.ok) {
              const verificationError = await verificationResponse.json();
              throw new Error(verificationError?.error || 'Payment verification failed');
            }

            trackEvent('purchase', {
              transaction_id: paymentResponse.razorpay_order_id,
              currency: 'INR',
              value: Number(quote?.total || 0),
              payment_id: paymentResponse.razorpay_payment_id,
              billing_period: billingPeriod,
              checkout_context: checkoutContext,
              coupon_code: appliedCoupon || undefined,
              items: [
                {
                  item_name: plan,
                  item_category: 'subscription',
                  price: Number(quote?.total || 0),
                  quantity: 1,
                },
              ],
            });

            setSuccess(true);
            showToast('Payment completed successfully.', 'success');
            setTimeout(() => {
              router.push('/profile');
            }, 1500);
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Payment verification failed', 'error');
          }
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            showToast('Payment cancelled', 'info');
          },
          confirm_close: true,
        },
        theme: {
          color: '#0f172a',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (failureResponse: any) {
        setProcessing(false);
        showToast(failureResponse?.error?.description || 'Payment failed', 'error');
      });
      razorpay.open();
      setProcessing(false);
    } catch (error) {
      setProcessing(false);
      showToast(error instanceof Error ? error.message : 'Unable to start payment', 'error');
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <div className="min-h-screen bg-slate-50 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <button
            onClick={() => router.push('/subscribe')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to plans
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {checkoutContext === 'renewal' ? 'Renew subscription' : 'Secure checkout'}
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">{planCopy.title}</h1>
                <p className="mt-2 text-slate-600">{planCopy.description}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Billing period</p>
                  <p className="text-lg font-semibold text-slate-900 capitalize">{billingPeriod === 'annually' ? 'Annual' : 'Monthly'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <label className="space-y-1 block">
                    <span className="text-sm font-medium text-slate-600">Coupon code</span>
                    <input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                    />
                  </label>
                  <button
                    onClick={handleApplyCoupon}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleClearCoupon}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
                  >
                    Clear
                  </button>
                </div>
                {quote?.couponStatus?.message && (
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${quote.couponStatus.applied ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    <TagIcon className="h-4 w-4" />
                    {quote.couponStatus.message}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-900">What happens next</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-start gap-3"><CheckIcon className="mt-0.5 h-5 w-5 text-emerald-600" /><span>Live pricing is fetched from your current plan configuration.</span></div>
                  <div className="flex items-start gap-3"><CheckIcon className="mt-0.5 h-5 w-5 text-emerald-600" /><span>Coupon validation happens on the server before order creation.</span></div>
                  <div className="flex items-start gap-3"><CheckIcon className="mt-0.5 h-5 w-5 text-emerald-600" /><span>Payment is finalized only after Razorpay verification succeeds.</span></div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-5 h-fit">
              <div>
                <p className="text-sm font-medium text-slate-500">Order summary</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Rs. {loadingQuote ? '...' : formatINR(Math.round(quote?.total || 0))}</h2>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Plan subtotal</span>
                  <span className="font-medium text-slate-900">Rs. {formatINR(Math.round(quote?.subtotal || 0))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <span className="font-medium text-emerald-700">- Rs. {formatINR(Math.round(quote?.discountAmount || 0))}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-base">
                  <span className="font-semibold text-slate-900">Total payable</span>
                  <span className="font-semibold text-slate-900">Rs. {formatINR(Math.round(quote?.total || 0))}</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loadingQuote || processing || success}
                className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {success ? 'Payment complete' : processing ? 'Preparing payment...' : checkoutContext === 'renewal' ? 'Continue renewal payment' : 'Continue to secure payment'}
              </button>

              <p className="text-xs leading-5 text-slate-500">
                This checkout page isolates the payment step from the pricing UI. Razorpay still handles the secure payment collection step.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}