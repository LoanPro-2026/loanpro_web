'use client';

import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: 'What is LoanPro and who is it built for?',
    answer: 'LoanPro is a Windows-first loan operations platform built for lenders, collection teams, finance offices, and branch operators that need clean daily execution. It centralizes loan creation, repayment tracking, cash movement, customer verification, and reporting so teams can run with fewer manual gaps.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes. You can submit a cancellation request at any time from your account or through support. Access generally continues until the end of your active billing cycle, and any refund eligibility is handled as per the current payment and cancellation policy.'
  },
  {
    question: 'What features are included in each plan?',
    answer: 'Every plan includes core loan workflows, repayment entries, and reporting. Pro adds cloud backup and Android companion capture support. Enterprise includes Pro capabilities plus controlled multi-device access, faster onboarding coordination, and priority issue handling.'
  },
  {
    question: 'How secure is data in LoanPro?',
    answer: 'LoanPro follows a local-first model where day-to-day operational data stays on your system for speed and control. If cloud backup is enabled, backups are written to your configured storage account. Account access and device usage are controlled by your team through authenticated workflows.'
  },
  {
    question: 'What support channels are available?',
    answer: 'You can reach LoanPro through the support form, support email, and phone for onboarding, billing, setup, and technical help. Each request gets a tracking reference and is triaged based on impact so business-critical issues are prioritized first.'
  },
  {
    question: 'How quickly can a new team start using LoanPro?',
    answer: 'Most teams can start operations on the same day after installation, account authentication, and basic setup. Historical data migration can be done in phases, so front-desk operations can begin immediately while older records are imported in a controlled timeline.'
  },
  {
    question: 'Is a trial available before purchasing?',
    answer: 'Yes. LoanPro provides a 1-month Pro trial so your team can evaluate real production workflows before purchasing. If you have a genuine rollout need, you can request a trial extension through support for eligibility review.'
  },
  {
    question: 'How does backup and recovery work?',
    answer: 'You can define backup frequency and retain local recovery points for continuity. On eligible plans, cloud backup can be enabled so data can be restored during system migration, reinstall, or device replacement with lower downtime risk.'
  },
  {
    question: 'What does first-time onboarding look like?',
    answer: 'First-time onboarding typically includes trial or subscription activation, desktop installation, account sign-in, organization setup, and access-token authentication. Once initial checks complete, your team can start creating and managing live loan records.'
  },
  {
    question: 'Why should I enable Android photo capture?',
    answer: 'Android photo capture adds visual identity verification to customer records. Teams can capture at loan creation and verify later during repayments, closures, and exception handling. This helps reduce identity disputes and improves field-level confidence.'
  },
  {
    question: 'How do I report an issue or request a feature?',
    answer: 'Submit a support request with clear reproduction steps, expected result, actual result, and urgency. Include screenshots, logs, or workflow context where possible. This speeds up diagnosis and helps product teams evaluate feature requests with better context.'
  },
  {
    question: 'How does cloud backup setup work?',
    answer: 'On eligible plans, connect your storage account, grant required permissions, and configure backup schedule and retention. LoanPro then runs scheduled backup jobs so your operational data remains recoverable across machine upgrades or reinstall scenarios.'
  }
];

const FAQSection = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <section className="py-16 bg-white" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-semibold text-slate-600">
            FAQs
          </div>
          <h2 className="mt-5 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Practical answers on onboarding, billing, reliability, data handling, and daily execution.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-white">
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none"
              >
                <h3 className="text-base font-semibold text-slate-900">{faq.question}</h3>
                <ChevronDownIcon
                  className={`w-5 h-5 text-slate-500 transition-transform ${
                    openFAQ === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openFAQ === idx && (
                <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900">Need more help?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Reach out for onboarding guidance, migration planning, plan selection, or issue resolution.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:support@loanpro.tech"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 transition-colors"
              >
                Contact support
              </a>
              <a
                href="tel:+917898885129"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold px-5 py-2.5 hover:border-slate-300 transition-colors"
              >
                Call us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection; 