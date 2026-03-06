'use client';

import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: 'What is LoanPro and how does it work?',
    answer: 'LoanPro is a Windows desktop loan management platform. It Allow Local lenders to Add, Remove, Delete Loans; Add Deposits; View Reports, Track Investments, Returns and Interest collection over a Period Of Time.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes. You can cancel at any time and refund will be calculated as per pro rata basis and will be manually refunded within 3-4 days.Your subscription stays active until the end of the billing period, and you can export your data if needed.'
  },
  {
    question: 'What features are included in each plan?',
    answer: 'Every plan includes core loan operations, Adding new Loan Record, Adding Deposits to Existing Loans, Closing Loans when repaid. Basic Reports and cash Flow Statements are also Stored. Higher tiers add cloud backup, Android photo capture workflow, and priority support. See the pricing section for full details.'
  },
  {
    question: 'How secure is my data with LoanPro?',
    answer: 'In LoanPro your data is stored in your own system locally and even we dont have access to your data. Also In cloud Backup your data is synced in your own google Account. So Complete Safety and Security to your data is maintained.'
  },
  {
    question: 'Do you offer customer support?',
    answer: 'Yes. We Offer Contact Form Support For Everyone. Navigate to Our support page and fill up the contact form. Our support team will reach out to you as soon as possible. '
  },
  {
    question: 'Can I Start using LoanPro immediately?',
    answer: 'LoanPro is a ready to use desktop application that you can start using immediately. However Your existing past records needs to entered manually for the system to work at full potential.'
  },
  {
    question: 'Is there a free trial available?',
    answer: 'Yes. We offer a 1-month Pro trial so users can explore the full workflow before any payment. Also free one month trial does not require any kind of payment set-up or credit card details so you can start using immediately. '
  },
  {
    question: 'How is my Data Secured?',
    answer: 'You can Set up a Auto backup Functionality at any location on your PC at the selected time interval lets say every 1 hour or 6 hour and save changes. Now the system will automatically backup your complete data at your choosen location.'
  },
  {
    question: 'How to OnBoard as the first time users',
    answer: 'Activate the subscription (paid or premium), then download the App from downloads Page and Install it, giving all required permissions. After that Go to your profile page, copy the access token and then enter the access token and give your office name, and device ID. Wait for some time for onboarding to be completed and here Your app is ready to use.       '
  },
  {
    question: 'Why should I use photo functionality?',
    answer: 'Photo functionality helps shop owners capture a customer image while creating a loan record and quickly view the same image while removing or closing records. This improves verification, reduces confusion between similar names, and works through your own Android phone camera.'
  },
  {
    question: 'How can I raise my concerns about the software',
    answer: 'There is a support ticket page which user can access from menubar. First choose your concern type, its priority and then explain it in detail and submit it. Our Support will reply to your requested concern and will contact you. user can directly chat with our support system there itself.'
  },
  {
    question: 'How does the Cloud database system work?',
    answer: 'First You need to connect your google account with us and give required permissions for drive backup(We only write our backup file into your google drive. Our system Cannot access other files in your drive). The select your backup interval and auto cloud sync is finally set up and completed.'
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