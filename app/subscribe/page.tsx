'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/components/ToastProvider';
import ProgressBar from '@/components/ProgressBar';

interface SubscriptionPlan {
  name: string;
  price: number;
  period: string;
  description: string;
  recommended?: boolean;
}

const plans: SubscriptionPlan[] = [
  {
    name: 'Monthly',
    price: 1249,
    period: 'month',
    description: 'Perfect for trying out LoanPro or for short-term needs. All features, no restrictions.'
  },
  {
    name: '6 Months',
    price: 5999,
    period: '6 months',
    description: 'Best value for growing businesses. Enjoy uninterrupted access and save more every cycle.',
    recommended: true
  },
  {
    name: 'Yearly',
    price: 10799,
    period: 'year',
    description: 'For established lenders who want maximum savings and peace of mind all year long.'
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
  const router = useRouter();
  const { user } = useUser();
  const { showToast } = useToast();

  const handleSubscribe = async (planName: string) => {
    try {
      setLoading(planName);
      
      // Create order
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ plan: planName }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: 'LoanPro',
        description: `${planName} Subscription`,
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
              }),
            });

            if (!paymentResponse.ok) {
              throw new Error('Payment verification failed');
            }

            // Show toast before redirect
            showToast('Subscription activated successfully!', 'success');
            setTimeout(() => {
              router.push('/app/dashboard');
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
          color: '#2563EB',
        },
        modal: {
          ondismiss: function() {
            setLoading(null);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
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
      
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-700 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              All features are included in every plan. You will be billed according to the plan you select—monthly, every 6 months, or yearly. No hidden fees, no surprises.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 ${
                  plan.recommended
                    ? 'border-blue-600 scale-105'
                    : 'border-blue-100'
                } hover:border-blue-600 transition`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex rounded-full bg-blue-500 px-4 py-1 text-sm font-semibold text-white">
                      Best Value
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-blue-700 mb-2">{plan.name}</h3>
                <div className="text-4xl font-extrabold text-blue-800 mb-2">₹{formatINR(plan.price)}</div>
                <div className="text-gray-500 mb-4">per {plan.period}</div>
                <p className="text-gray-700 mb-6 text-center">{plan.description}</p>

                <ul className="text-gray-700 mb-6 text-left list-disc list-inside w-full">
                  <li>Unlimited customers & loans</li>
                  <li>Free subdomain</li>
                  <li>Priority support</li>
                  <li>All features included</li>
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={loading === plan.name}
                  className={`mt-auto w-full px-6 py-2 rounded-lg shadow transition font-semibold ${
                    loading === plan.name
                      ? 'bg-gray-400 cursor-not-allowed'
                      : plan.recommended
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-800 text-white hover:bg-gray-900'
                  }`}
                >
                  {loading === plan.name ? 'Processing...' : `Subscribe to ${plan.name}`}
                </button>
                <div className="mt-4 text-xs text-gray-500">Cancel anytime. No questions asked.</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
} 