'use client';

import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: 'What is LoanPro and how does it work?',
    answer: 'LoanPro is a Windows desktop loan management platform. It keeps day-to-day data local for speed and control, with optional cloud backup for protection and access when needed.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes. You can cancel at any time. Your subscription stays active until the end of the billing period, and you can export your data if needed.'
  },
  {
    question: 'What features are included in each plan?',
    answer: 'Every plan includes core loan tracking, collections, and reporting. Higher tiers add cloud backup, biometrics, and priority support. See the pricing section for full details.'
  },
  {
    question: 'How secure is my data with LoanPro?',
    answer: 'LoanPro uses strong access controls and secure storage practices. If you use cloud backup, data is encrypted in transit. Contact us for a full security overview.'
  },
  {
    question: 'Do you offer customer support?',
    answer: 'Yes. We provide email support for all plans and priority support for Pro and Enterprise.'
  },
  {
    question: 'Can I integrate LoanPro with my existing systems?',
    answer: 'Integration options depend on your plan and requirements. Contact us to discuss payment or accounting integrations.'
  },
  {
    question: 'Is there a free trial available?',
    answer: 'Yes. We offer a 1-month Pro trial so you can explore the full workflow before subscribing.'
  },
  {
    question: 'How does the hybrid database system work?',
    answer: 'Your primary data stays on your device for speed and control. Cloud backup is optional and designed for recovery and remote access.'
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
            Answers to common questions about setup, plans, and support.
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
              Reach out to our team for onboarding guidance or plan recommendations.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:support@loanpro.tech"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 transition-colors"
              >
                Contact support
              </a>
              <a
                href="tel:+911234567890"
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