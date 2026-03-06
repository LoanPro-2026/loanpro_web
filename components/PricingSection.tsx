import React from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';
import { CheckIcon } from '@heroicons/react/24/outline';

const plans = [
  {
    name: 'Basic',
    price: '₹599',
    period: '/month',
    description: 'Essential tools for small Shop Owners',
    deviceLimit: 1,
    storage: 'Local only',
    features: [
      'Core loan tracking and collections',
      'Local data storage',
      'Basic analytics dashboard',
      'Standard reports',
      'Email support',
    ],
    popular: false,
    tone: 'border-slate-200'
  },
  {
    name: 'Pro',
    price: '₹899',
    period: '/month',
    description: 'For growing Shop owners with Large Number of Loans',
    deviceLimit: 1,
    storage: 'Drive Backup Support(upto 15GB)',
    features: [
      'Everything in Basic',
      'Google Drive Cloud Backup',
      'Android photo capture',
      'Daily automatic sync',
      'Advanced analytics & reports',
      'Priority support',
      'Feature request'
    ],
    popular: true,
    tone: 'border-blue-600'
  },
  {
    name: 'Enterprise',
    price: '₹1,399',
    period: '/month',
    description: 'Advanced controls for large Shop Owners',
    deviceLimit: 2,
    storage: 'Drive Backup + Additional Cloud Support',
    features: [
      'Everything in Pro',
      'Additional cloud backup',
      'Additional Customization',
      'Dual device support',
      'Custom sync schedules',
      'Dedicated onboarding',
      'Phone support',
      'Dedicated Support Ticket System',
      ],
    popular: false,
    tone: 'border-slate-200'
  }
];

const PricingSection = () => (
  <section className="py-16 bg-slate-50" id="pricing">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-14">
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600">
          Pricing
        </div>
        <h2 className="mt-5 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
          Simple, transparent pricing
        </h2>
        <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
          All plans include core loan management features. Choose the level of backup and support your team needs.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/subscribe"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 transition-colors"
          >
            Start free trial
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`relative rounded-2xl border ${plan.tone} bg-white p-6 shadow-sm ${plan.popular ? 'ring-2 ring-blue-600' : ''}`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Most popular
              </span>
            )}

            <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

            <div className="mt-6">
              <span className="text-3xl font-semibold text-slate-900">{plan.price}</span>
              <span className="text-slate-500">{plan.period}</span>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{plan.deviceLimit} device{plan.deviceLimit > 1 ? 's' : ''}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{plan.storage}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {plan.features.map((feature, featureIdx) => (
                <div key={featureIdx} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckIcon className="mt-0.5 h-4 w-4 text-blue-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 transition-colors">
                    Get started
                  </button>
                </SignUpButton>
              </SignedOut>

              <SignedIn>
                <Link
                  href="/subscribe"
                  className="block w-full text-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 transition-colors"
                >
                  Choose plan
                </Link>
              </SignedIn>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-slate-600">
        Need a custom plan or volume licensing? <Link href="/support" className="text-blue-600 hover:text-blue-700 font-semibold">Contact sales</Link>.
      </div>
    </div>
  </section>
);

export default PricingSection; 