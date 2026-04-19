'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckIcon } from '@heroicons/react/24/outline';
import { trackEvent } from '@/lib/googleAnalytics';
import { trackFunnelEvent } from '@/lib/funnelTracking';

type BillingPeriod = 'monthly' | 'annually';

interface PricingPlan {
  name: string;
  monthlyPrice: number;
  description: string;
  deviceLimit: number;
  storage: string;
  features: string[];
  popular: boolean;
  tone: string;
}

interface PricingSectionClientProps {
  plans: PricingPlan[];
  salesPhone: string;
  salesCallEnabled: boolean;
}

function formatINR(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export default function PricingSectionClient({ plans, salesPhone, salesCallEnabled }: PricingSectionClientProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const callHref = `tel:${salesPhone.replace(/\s+/g, '')}`;

  const computedPlans = useMemo(
    () =>
      plans.map((plan) => {
        const annualPrice = Math.round(plan.monthlyPrice * 12 * 0.85);
        return {
          ...plan,
          displayPrice: billingPeriod === 'monthly' ? plan.monthlyPrice : annualPrice,
          periodLabel: billingPeriod === 'monthly' ? '/month' : '/year',
          annualListPrice: plan.monthlyPrice * 12,
        };
      }),
    [plans, billingPeriod]
  );

  return (
    <section className="py-16 bg-slate-50" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600">
            Plan guidance
          </div>
          <h2 className="mt-5 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
            Talk to an expert before choosing a plan
          </h2>
          <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
            We still show transparent pricing below, but most customers prefer a quick call first. Our team helps you pick the right plan based on your workflow, device count, and backup needs.
          </p>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5 max-w-3xl mx-auto">
            <p className="text-sm sm:text-base text-blue-900 font-semibold">
              Prefer to talk first? Get a recommendation and setup guidance before paying.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3">
              <a
                href={callHref}
                aria-disabled={!salesCallEnabled}
                tabIndex={salesCallEnabled ? 0 : -1}
                onClick={(event) => {
                  if (!salesCallEnabled) {
                    event.preventDefault();
                    return;
                  }
                }}
                onClickCapture={() =>
                  {
                    void trackFunnelEvent('agent_call_clicked', {
                      source: 'pricing_section_top',
                      billing_period: billingPeriod,
                    });
                  trackEvent('click_call_agent', {
                    source: 'pricing_section_top',
                    billing_period: billingPeriod,
                  });
                  }
                }
                className={`inline-flex items-center justify-center rounded-lg bg-blue-700 text-white font-semibold px-5 py-2.5 transition-colors ${salesCallEnabled ? 'hover:bg-blue-800' : 'opacity-50 cursor-not-allowed'}`}
              >
                Call Sales Agent
              </a>
              <Link
                href="/support?inquiryType=pricing&source=pricing_top&funnelStage=consideration&message=I%20want%20help%20choosing%20the%20right%20LoanPro%20plan%20for%20my%20shop."
                onClick={() =>
                  {
                    void trackFunnelEvent('pricing_discussion_clicked', {
                      source: 'pricing_section_top',
                      billing_period: billingPeriod,
                    });
                    trackEvent('click_contact_agent', {
                      source: 'pricing_section_top',
                      billing_period: billingPeriod,
                    });
                  }
                }
                className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-100 font-semibold px-5 py-2.5 transition-colors"
              >
                Talk on Contact Form
              </Link>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="border border-slate-200 bg-white rounded-lg p-1" role="tablist" aria-label="Billing period switcher">
              <div className="flex items-center">
                <button
                  type="button"
                  role="tab"
                  aria-selected={billingPeriod === 'monthly'}
                  onClick={() => {
                    setBillingPeriod('monthly');
                    trackEvent('select_billing_period', {
                      billing_period: 'monthly',
                      source: 'pricing_section',
                    });
                  }}
                  className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
                    billingPeriod === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={billingPeriod === 'annually'}
                  onClick={() => {
                    setBillingPeriod('annually');
                    trackEvent('select_billing_period', {
                      billing_period: 'annually',
                      source: 'pricing_section',
                    });
                  }}
                  className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
                    billingPeriod === 'annually' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annual (Save 15%)
                </button>
              </div>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {computedPlans.map((plan) => (
            <div
              key={plan.name}
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
                <span className="text-3xl font-semibold text-slate-900">{formatINR(plan.displayPrice)}</span>
                <span className="text-slate-500">{plan.periodLabel}</span>
                {billingPeriod === 'annually' && (
                  <div className="mt-1 text-xs text-slate-500">
                    <span className="line-through">{formatINR(plan.annualListPrice)}</span>
                    <span className="text-green-600 font-semibold ml-2">Save 15%</span>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {plan.deviceLimit} device{plan.deviceLimit > 1 ? 's' : ''}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{plan.storage}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckIcon className="mt-0.5 h-4 w-4 text-blue-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-2">
                <Link
                  href={`/support?inquiryType=pricing&source=pricing_card&funnelStage=consideration&message=I%20need%20help%20choosing%20the%20${encodeURIComponent(plan.name)}%20plan.%20Billing:%20${billingPeriod}.`}
                  onClick={() =>
                    {
                      void trackFunnelEvent('pricing_discussion_clicked', {
                        source: 'pricing_plan_card',
                        plan: plan.name,
                        billing_period: billingPeriod,
                      });
                      trackEvent('click_discuss_plan', {
                        source: 'pricing_plan_card',
                        plan: plan.name,
                        billing_period: billingPeriod,
                      });
                    }
                  }
                  className="block w-full text-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 transition-colors"
                >
                  Discuss this plan
                </Link>

                <Link
                  href={`/subscribe?billingPeriod=${billingPeriod}`}
                  onClick={() =>
                    trackEvent('click_subscribe_direct', {
                      source: 'pricing_plan_card_secondary',
                      plan: plan.name,
                      billing_period: billingPeriod,
                    })
                  }
                  className="block w-full text-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 font-semibold py-2.5 transition-colors"
                >
                  Continue without consultation
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-slate-600">
          Need a custom plan or volume licensing?{' '}
          <Link href="/support" className="text-blue-600 hover:text-blue-700 font-semibold">
            Talk to sales
          </Link>
          .
        </div>
      </div>
    </section>
  );
}
