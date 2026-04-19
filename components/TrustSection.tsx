import React from 'react';
import Link from 'next/link';
import {
  PhoneArrowUpRightIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { connectToDatabase } from '@/lib/mongodb';

const trustSignals = [
  {
    title: 'Real person onboarding',
    description:
      'We guide your first setup call so your staff can start using LoanPro confidently from day one.',
    icon: UserGroupIcon,
  },
  {
    title: 'Data stays in your control',
    description:
      'Loan records run locally on your Windows desktop with optional cloud backup based on your preference.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Fast response support',
    description:
      'Most sales and setup questions get a callback the same day during working hours.',
    icon: ClockIcon,
  },
];

const TrustSection = async () => {
  let salesPhone = '+91 78988 85129';
  let salesDefaultMessage = 'I want a guided walkthrough before I decide on a plan.';

  try {
    const { db } = await connectToDatabase();
    const settings = await db.collection('admin_settings').findOne({ key: 'global' });
    salesPhone = String(settings?.value?.salesPhone || salesPhone);
    salesDefaultMessage = String(settings?.value?.salesDefaultMessage || salesDefaultMessage);
  } catch {
    // Keep defaults when database access is not available.
  }

  const supportHref = `/support?inquiryType=sales&message=${encodeURIComponent(salesDefaultMessage)}`;

  return (
    <section className="py-16 bg-slate-50" id="trust">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
                Trust first, then plan
              </div>
              <h2 className="mt-5 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
                Unsure if this software is right for your shop?
              </h2>
              <p className="mt-3 text-lg text-slate-600 max-w-2xl">
                That is normal. Most business owners want to talk to someone before paying. Our team will understand your workflow, explain setup, and suggest the right plan without pressure.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href={supportHref}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Speak with sales
                  <PhoneArrowUpRightIcon className="w-4 h-4" />
                </Link>
                <a
                  href={`tel:${salesPhone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-slate-700 font-semibold hover:border-slate-300 hover:text-slate-900 transition-colors"
                >
                  Call {salesPhone}
                </a>
              </div>
            </div>

            <div className="space-y-4">
              {trustSignals.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;