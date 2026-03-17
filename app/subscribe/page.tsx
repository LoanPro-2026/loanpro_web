'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/components/ToastProvider';
import ProgressBar from '@/components/ProgressBar';
import { CheckIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface SubscriptionPlan {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  limitations?: string[];
  recommended?: boolean;
  gradient: string;
  comingSoon?: boolean;
  deviceLimit: number;
  storage: string;
}

const plans: SubscriptionPlan[] = [
  {
    name: 'Basic',
    price: 599,
    period: 'month',
    description: 'Core plan for daily loan operations',
    deviceLimit: 1,
    storage: 'Local only',
    features: [
      'All core features included',
      'Unlimited active records',
      'Basic analytics dashboard',
      'Standard reports',
      'Local data storage',
      'Email support'
    ],
    limitations: [
      'No mobile sync',
      'No cloud backup',
      'Single device support only'
    ],
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    name: 'Pro',
    price: 899,
    period: 'month',
    description: 'Most popular for growing operations',
    deviceLimit: 1,
    storage: '15 GB cloud backup',
    features: [
      'Everything in Basic',
      'Unlimited active records',
      'Cloud backup support',
      'Mobile sync support',
      'Android photo capture enabled',
      'Daily cloud sync',
      'Priority support'
    ],
    limitations: [
      'Single device support only'
    ],
    recommended: true,
    gradient: 'from-purple-500 to-purple-600'
  },
  {
    name: 'Enterprise',
    price: 1399,
    period: 'month',
    description: 'Pro plan with 2-device token access',
    deviceLimit: 2,
    storage: '15 GB cloud backup',
    features: [
      'Everything in Pro',
      'Unlimited active records',
      '2 app devices on same access token',
      'Enterprise onboarding priority',
      'Priority issue handling'
    ],
    gradient: 'from-pink-500 to-pink-600'
  }
];

function formatINR(amount: number) {
  return amount.toLocaleString('en-IN');
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PostPurchaseData {
  planName: string;
  billingPeriod: 'monthly' | 'annually';
  amount: number;
}

interface PricingQuoteResponse {
  plans?: Record<string, { monthly: number; annually: number; monthlyBase: number }>;
}

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('Pro');
  const [showPostPurchasePanel, setShowPostPurchasePanel] = useState(false);
  const [postPurchaseData, setPostPurchaseData] = useState<PostPurchaseData | null>(null);
  const [livePricing, setLivePricing] = useState<Record<string, { monthly: number; annually: number; monthlyBase: number }>>({});
  const router = useRouter();
  const { user } = useUser();
  const { showToast } = useToast();
  const displayPlans = plans.map((plan) => ({
    ...plan,
    price: livePricing[plan.name]?.monthlyBase ?? plan.price,
  }));
  const selectedPlanData = displayPlans.find((p) => p.name === selectedPlan) || displayPlans[1];

  const extensionContactUrl = (() => {
    const query = new URLSearchParams({
      inquiryType: 'pricing',
      source: 'trial_extension_request',
      message:
        'I want to request an extension from the default 1-month trial to 6 months. Please review my account for eligibility.',
    });

    const email = user?.primaryEmailAddress?.emailAddress;
    const name = user?.fullName;
    if (email) query.set('email', email);
    if (name) query.set('name', name);

    return `/support?${query.toString()}`;
  })();

  useEffect(() => {
    let disposed = false;

    const fetchLivePricing = async () => {
      try {
        const response = await fetch('/api/pricing/quote', { credentials: 'include' });
        const data = await response.json() as PricingQuoteResponse;
        if (!disposed && data.plans) {
          setLivePricing(data.plans);
        }
      } catch (error) {
        if (!disposed) {
          console.error('Failed to fetch live pricing', error);
        }
      }
    };

    void fetchLivePricing();
    return () => {
      disposed = true;
    };
  }, []);

  // Auto-close modal and redirect after 10 seconds
  useEffect(() => {
    if (showPostPurchasePanel) {
      const timer = setTimeout(() => {
        setShowPostPurchasePanel(false);
        router.push('/profile');
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [showPostPurchasePanel, router]);

  // Calculate final amount based on billing period (in paise for Razorpay)
  const calculateFinalAmount = (monthlyPrice: number, period: 'monthly' | 'annually') => {
    if (period === 'monthly') {
      return monthlyPrice * 100; // Convert to paise
    } else {
      // Annual billing with 15% discount, converted to paise
      return Math.round(monthlyPrice * 12 * 0.85 * 100);
    }
  };

  // Get period text
  const getPeriodText = (period: 'monthly' | 'annually') => {
    return period === 'monthly' ? '/month' : '/year';
  };

  // Validation function
  const validateCheckout = (planName: string, period: 'monthly' | 'annually'): boolean => {
    if (!planName) {
      showToast('Please select a plan', 'error');
      return false;
    }
    if (!period) {
      showToast('Please select billing period', 'error');
      return false;
    }
    return true;
  };

  const handleSubscribeWithValidation = (planName: string, period: 'monthly' | 'annually') => {
    if (validateCheckout(planName, period)) {
      handleSubscribe(planName, period);
    }
  };

  const handleFreeTrial = async () => {
    try {
      setTrialLoading(true);
      
      const response = await fetch('/api/start-free-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: user?.username || user?.fullName,
          email: user?.primaryEmailAddress?.emailAddress,
          fullName: user?.fullName,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start free trial');
      }

      showToast('1-month Pro trial started successfully!', 'success');
      setTimeout(() => {
        router.push('/download');
      }, 1200);
      
    } catch (error: any) {
      console.error('Error starting free trial:', error);
      showToast(error.message || 'Failed to start free trial', 'error');
      setTrialLoading(false);
    }
  };

  const handleSubscribe = async (planName: string, billingPeriod: 'monthly' | 'annually' = 'monthly') => {
    setLoading(planName);
    router.push(`/checkout?plan=${encodeURIComponent(planName)}&billingPeriod=${billingPeriod}&context=new`);
  };

  return (
    <>
      <ProgressBar show={!!loading} />
      <div className="min-h-screen bg-slate-50 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600">
              Choose your plan
            </div>
            <h1 className="mt-5 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
              Pricing for every team
            </h1>
            <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
              All plans include core loan management features. Select the backup and support level you need.
            </p>
            
            {/* Free Trial CTA */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl mx-auto mb-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Start with a free trial</h3>
              <p className="text-slate-600 mb-4">
                Try the Pro plan for 1 month. No credit card required.
              </p>
              <button
                onClick={handleFreeTrial}
                disabled={trialLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <span>{trialLoading ? 'Starting trial...' : 'Start free trial'}</span>
                {!trialLoading && <ArrowRightIcon className="w-4 h-4" />}
              </button>
              <p className="text-sm text-slate-500 mt-3">
                Includes Android photo capture, analytics, and priority support.
                {' '}
                <Link href={extensionContactUrl} className="text-blue-600 hover:text-blue-700 font-semibold">
                  Need more time? Contact us to request extension up to 6 months.
                </Link>
              </p>
            </div>

            {/* Billing Period Toggle */}
            <div className="flex justify-center mb-8">
              <div className="border border-slate-200 bg-white rounded-lg p-1">
                <div className="flex items-center">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
                      billingPeriod === 'monthly'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod('annually')}
                    className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
                      billingPeriod === 'annually'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Annual (Save 15%)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
            {displayPlans.map((plan) => (
              <div
                key={plan.name}
                className="relative"
              >
                {/* Popular Badge */}
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold">
                      Most popular
                    </div>
                  </div>
                )}

                {/* Coming Soon Badge */}
                {plan.comingSoon && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-semibold">
                      Coming Soon
                    </div>
                  </div>
                )}

                <div className={`bg-white border ${plan.recommended ? 'border-blue-600' : 'border-slate-200'} rounded-2xl p-6 shadow-sm`}>
                  <div>
                    {/* Plan Header */}
                    <div className="text-center mb-8">
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">{plan.name}</h3>
                      <p className="text-sm text-slate-600">{plan.description}</p>
                      
                      {/* Pricing */}
                      <div className="mb-6">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <span className="text-3xl font-semibold text-slate-900">
                            ₹{formatINR(calculateFinalAmount(plan.price, billingPeriod) / 100)}
                          </span>
                          <span className="text-slate-500">{getPeriodText(billingPeriod)}</span>
                        </div>
                        {billingPeriod === 'annually' && (
                          <div className="text-xs text-slate-500">
                            <span className="line-through">₹{formatINR(plan.price * 12)}</span>
                            <span className="text-green-600 font-semibold ml-2">Save 15%</span>
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-1">
                          Base plan: ₹{formatINR(plan.price)}/month
                        </div>
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-600">
                          <span className="px-3 py-1 rounded-full bg-slate-100">{plan.deviceLimit} device{plan.deviceLimit > 1 ? 's' : ''}</span>
                          <span className="px-3 py-1 rounded-full bg-slate-100">{plan.storage}</span>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
                      <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wide">Included features</h4>
                      {plan.features.map((feature, featureIdx) => (
                        <div key={featureIdx} className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Limitations */}
                    {plan.limitations && plan.limitations.length > 0 && (
                      <div className="space-y-3 mb-8">
                        <h4 className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Limitations</h4>
                        {plan.limitations.map((limitation, limitationIdx) => (
                          <div key={limitationIdx} className="flex items-center gap-2">
                            <XMarkIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-500">{limitation}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CTA Button */}
                    <button
                      onClick={() => {
                        if (plan.comingSoon) return;
                        setSelectedPlan(plan.name);
                        handleSubscribeWithValidation(plan.name, billingPeriod);
                      }}
                      disabled={loading === plan.name || plan.comingSoon}
                      className={`w-full ${plan.comingSoon 
                        ? 'bg-slate-300 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                      } text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                        loading === plan.name ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span>
                        {plan.comingSoon 
                          ? 'Coming Soon' 
                          : loading === plan.name 
                            ? 'Processing...' 
                            : `Choose ${plan.name}`
                        }
                      </span>
                      {!plan.comingSoon && loading !== plan.name && (
                        <ArrowRightIcon className="w-4 h-4" />
                      )}
                    </button>
                    
                    <div className="mt-4 text-center">
                      <p className="text-slate-500 text-xs">Cancel anytime • No setup fees</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sticky summary bar */}
          <div className="sticky bottom-4 z-20 mb-32">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3 text-slate-900 font-semibold">
                  <span>{selectedPlanData.name} · {billingPeriod === 'annually' ? 'Annual (15% off)' : 'Monthly'}</span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">{selectedPlanData.deviceLimit} device{selectedPlanData.deviceLimit > 1 ? 's' : ''}</span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">{selectedPlanData.storage}</span>
                </div>
                <div className="text-sm text-slate-600 mt-1">₹{formatINR(calculateFinalAmount(selectedPlanData.price, billingPeriod) / 100)} {billingPeriod === 'annually' ? '/year (paid upfront)' : '/month'}</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSubscribeWithValidation(selectedPlanData.name, billingPeriod)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors"
                >
                  Complete purchase
                </button>
                <button
                  onClick={handleFreeTrial}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:border-slate-300 transition-colors font-semibold"
                >
                  Start 1-month trial
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="text-center">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-4xl mx-auto">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Need help choosing?</h3>
              <p className="text-slate-600 mb-6">
                All plans include core loan management features. The main differences are cloud storage and device support.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href={extensionContactUrl} className="bg-white border border-slate-200 text-slate-700 font-semibold px-6 py-2.5 rounded-lg hover:border-slate-300 transition-colors">
                  Contact sales
                </Link>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
                  Try free demo
                </button>
              </div>
              <p className="text-slate-500 text-sm mt-4">
                1-month free trial available • Secure payment via Razorpay
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Post-Purchase Success Modal */}
      {showPostPurchasePanel && postPurchaseData && (
        <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-500">
            
            {/* Header with professional design */}
            <div className="relative bg-slate-900 px-8 py-12 text-center text-white">
              <div className="relative">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-2">Welcome to LoanPro</h2>
                <p className="text-slate-200 text-lg">Your subscription is now active</p>
                <p className="text-slate-400 text-sm mt-2">Redirecting to your profile in 10 seconds...</p>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="px-8 py-8 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Subscription Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-slate-900 mb-4 text-lg">Your Plan Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Plan:</span>
                    <span className="font-bold text-slate-900 capitalize">{postPurchaseData.planName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Billing:</span>
                    <span className="font-bold text-slate-900 capitalize">{postPurchaseData.billingPeriod === 'monthly' ? 'Monthly' : 'Annual (15% Discount)'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                    <span className="text-slate-700">Total Amount:</span>
                    <span className="font-bold text-xl text-slate-900">₹{formatINR(postPurchaseData.amount / 100)}</span>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="mb-8">
                <h3 className="font-semibold text-slate-900 mb-4 text-lg">Next Steps to Get Started</h3>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-semibold text-sm mt-0.5">1</div>
                    <div>
                      <p className="font-semibold text-slate-900">Download Desktop Application</p>
                      <p className="text-slate-600 text-sm">Install LoanPro on your Windows PC to manage loans locally</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-semibold text-sm mt-0.5">2</div>
                    <div>
                      <p className="font-semibold text-slate-900">Pair Your Android Phone</p>
                      <p className="text-slate-600 text-sm">Connect your phone camera for customer photo capture and verification</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-semibold text-sm mt-0.5">3</div>
                    <div>
                      <p className="font-semibold text-slate-900">Manage Your Loans</p>
                      <p className="text-slate-600 text-sm">Start using all features of your {postPurchaseData.planName} plan</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowPostPurchasePanel(false);
                    router.push('/download');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  Download app now
                </button>
                <button
                  onClick={() => {
                    setShowPostPurchasePanel(false);
                    router.push('/profile');
                  }}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-center"
                >
                  Manage devices
                </button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-4">
                You can anytime manage your subscription in your profile
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 