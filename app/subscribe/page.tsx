'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
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
}

const plans: SubscriptionPlan[] = [
  {
    name: 'Basic',
    price: 699,
    period: 'month',
    description: 'Essential features for small loan businesses',
    features: [
      'All core features included',
      'Basic analytics dashboard',
      'Standard templates',
      'Local data storage',
      'Email support'
    ],
    limitations: [
      'No cloud facility',
      'No biometric authentication',
      'Limited customer support',
      'Single device support only'
    ],
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    name: 'Pro',
    price: 999,
    period: 'month',
    description: 'Most popular choice for growing loan businesses',
    features: [
      'All features included',
      'Advanced analytics & reports',
      'Limited cloud database (1GB)',
      'Priority support',
      'Biometrics Available',
      'Daily Cloud Sync'
    ],
    limitations: [
      'No automatic sync',
      'Single device support only'
    ],
    recommended: true,
    gradient: 'from-purple-500 to-purple-600'
  },
  {
    name: 'Enterprise',
    price: 1699,
    period: 'month',
    description: 'Complete solution for large organizations',
    features: [
      'All features included',
      'Unlimited cloud support',
      'Dual device support (2 devices)',
      'Automatic sync enabled',
      'Biometric authentication',
      'White-label solution',
      '24/7 phone support',
      'Dedicated Analytics manager'
    ],
    gradient: 'from-pink-500 to-pink-600',
    comingSoon: true
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

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');
  const router = useRouter();
  const { user } = useUser();
  const { showToast } = useToast();

  // Calculate final amount based on billing period
  const calculateFinalAmount = (monthlyPrice: number, period: 'monthly' | 'annually') => {
    if (period === 'monthly') {
      return monthlyPrice;
    } else {
      // Annual billing with 15% discount
      return Math.round(monthlyPrice * 12 * 0.85);
    }
  };

  // Get period text
  const getPeriodText = (period: 'monthly' | 'annually') => {
    return period === 'monthly' ? '/month' : '/year';
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
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start free trial');
      }

      showToast('14-day Pro trial started successfully!', 'success');
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
    try {
      setLoading(planName);
      
      const selectedPlan = plans.find(plan => plan.name === planName);
      if (!selectedPlan) {
        throw new Error('Plan not found');
      }
      
      const finalAmount = calculateFinalAmount(selectedPlan.price, billingPeriod);
      
      // Create order
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          plan: planName, 
          billingPeriod: billingPeriod,
          amount: finalAmount 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to create order: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.orderId) {
        throw new Error('Invalid response from server');
      }

      // Initialize Razorpay with enhanced UI options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: 'LoanPro',
        description: `${planName} Subscription - ${billingPeriod === 'monthly' ? 'Monthly' : 'Annual'}`,
        image: '/logo.png', // Add your logo for better branding
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            // Send payment details to our backend
            const paymentResponse = await fetch('/api/payment-success', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                userId: user?.id,
                username: user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress,
                plan: planName,
                billingPeriod: billingPeriod, // Add billing period to payment success
              }),
            });

            if (!paymentResponse.ok) {
              throw new Error('Payment verification failed');
            }

            // Show toast before redirect
            showToast('Subscription activated successfully!', 'success');
            setTimeout(() => {
              router.push('/download');
            }, 1200);
          } catch (error) {
            console.error('Error verifying payment:', error);
            alert('Payment successful but verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
        },
        theme: {
          color: '#8B5CF6', // Purple theme to match your brand
          backdrop_color: 'rgba(139, 92, 246, 0.1)' // Light purple backdrop
        },
        modal: {
          backdropclose: false, // Prevent accidental closes
          escape: true,
          handleback: true,
          confirm_close: true, // Ask for confirmation before closing
          ondismiss: function() {
            setLoading(null);
            showToast('Payment cancelled', 'info');
          },
          animation: true // Smooth animations
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        timeout: 900, // 15 minutes timeout
        remember_customer: false,
        readonly: {
          email: true,
          name: true,
          contact: false
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Error:', error);
      showToast(error.message || 'Something went wrong. Please try again.', 'error');
      setLoading(null);
    }
  };

  return (
    <>
      <ProgressBar show={!!loading} />
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-blue-50 pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        {/* Background Elements */}
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-6 py-2 mb-6">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-purple-600 font-semibold">Choose Your Plan</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Select Your 
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Perfect Plan</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Choose the plan that best fits your business needs. All plans include core features with different levels of support and functionality.
            </p>
            
            {/* Free Trial CTA */}
            <div className="bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 rounded-2xl p-6 max-w-2xl mx-auto mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                🎉 Start Your Free Trial Today!
              </h3>
              <p className="text-gray-600 mb-4">
                Get full access to <strong>Pro features</strong> for 14 days - no credit card required!
              </p>
              <button
                onClick={handleFreeTrial}
                disabled={trialLoading}
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 mx-auto"
              >
                <span>{trialLoading ? 'Starting Trial...' : 'Start 14-Day Free Trial'}</span>
                {!trialLoading && <ArrowRightIcon className="w-5 h-5" />}
              </button>
              <p className="text-sm text-gray-500 mt-3">
                Includes: Biometric authentication, analytics, priority support, and more!
              </p>
            </div>

            {/* Billing Period Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      billingPeriod === 'monthly'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-white/30'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod('annually')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
                      billingPeriod === 'annually'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-white/30'
                    }`}
                  >
                    Annually
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Save 15%
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative group ${plan.recommended ? 'scale-105 z-10' : ''}`}
              >
                {/* Popular Badge */}
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Coming Soon Badge */}
                {plan.comingSoon && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                      Coming Soon
                    </div>
                  </div>
                )}

                <div className="relative bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-8 hover:bg-white/30 transition-all duration-500 hover:scale-105 shadow-2xl">
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient.replace('from-', 'from-').replace('to-', 'to-')}/10 opacity-0 group-hover:opacity-20 rounded-3xl transition-opacity duration-500`}></div>
                  
                  <div className="relative">
                    {/* Plan Header */}
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-gray-600 mb-6">{plan.description}</p>
                      
                      {/* Pricing */}
                      <div className="mb-6">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <span className="text-4xl font-bold text-gray-900">
                            ₹{formatINR(calculateFinalAmount(plan.price, billingPeriod))}
                          </span>
                          <span className="text-gray-600">{getPeriodText(billingPeriod)}</span>
                        </div>
                        {billingPeriod === 'annually' && (
                          <div className="text-sm text-gray-500">
                            <span className="line-through">₹{formatINR(plan.price * 12)}</span>
                            <span className="text-green-600 font-semibold ml-2">Save 15%</span>
                          </div>
                        )}
                        <div className="text-sm text-gray-500 mt-1">
                          Base plan: ₹{formatINR(plan.price)}/month
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-4 mb-6">
                      <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Included Features</h4>
                      {plan.features.map((feature, featureIdx) => (
                        <div key={featureIdx} className="flex items-center space-x-3">
                          <div className={`w-5 h-5 bg-gradient-to-r ${plan.gradient} rounded-full flex items-center justify-center flex-shrink-0`}>
                            <CheckIcon className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Limitations */}
                    {plan.limitations && plan.limitations.length > 0 && (
                      <div className="space-y-4 mb-8">
                        <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Limitations</h4>
                        {plan.limitations.map((limitation, limitationIdx) => (
                          <div key={limitationIdx} className="flex items-center space-x-3">
                            <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                              <XMarkIcon className="w-3 h-3 text-gray-600" />
                            </div>
                            <span className="text-gray-600 text-sm">{limitation}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CTA Button */}
                    <button
                      onClick={() => !plan.comingSoon && handleSubscribe(plan.name, billingPeriod)}
                      disabled={loading === plan.name || plan.comingSoon}
                      className={`w-full ${plan.comingSoon 
                        ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                        : `bg-gradient-to-r ${plan.gradient}`
                      } text-white font-bold py-4 px-6 rounded-2xl shadow-lg ${plan.comingSoon 
                        ? '' 
                        : 'hover:shadow-xl transform hover:scale-105'
                      } transition-all duration-300 flex items-center justify-center space-x-2 ${
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
                        <ArrowRightIcon className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className="mt-4 text-center">
                      <p className="text-gray-500 text-sm">Cancel anytime • No setup fees</p>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${plan.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10`}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Section */}
          <div className="text-center">
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Need Help Choosing?
              </h3>
              <p className="text-gray-600 mb-6">
                All plans include our core loan management features. The difference is in cloud storage, device support, and additional premium features.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button className="bg-white/30 hover:bg-white/40 text-gray-700 font-semibold px-6 py-3 rounded-xl border border-white/40 transition-all duration-300">
                  Contact Sales
                </button>
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Try Free Demo
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                💡 14-day free trial available • Secure payment via Razorpay
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 