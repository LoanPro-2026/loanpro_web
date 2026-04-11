'use client';

import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: 'What is LoanPro and who is it for?',
    answer: 'LoanPro is a simple Windows app built for people running informal lending businesses, especially those giving loans against gold and silver. It replaces your paper register and helps you track daily loans securely on your computer.'
  },
  {
    question: 'Do I need a continuous internet connection to use it?',
    answer: 'No. LoanPro works completely offline on your shop computer so your daily work is never delayed. It only needs the internet when you want to backup your records to the cloud or sync subscriptions.'
  },
  {
    question: 'What features do I get?',
    answer: 'You get simple daily dashboards, cash tracking, loan receipt printing, and simple reporting. With higher plans, you also get an Android app to take photos of your customers or the gold/silver items.'
  },
  {
    question: 'Are my shop records safe?',
    answer: 'Yes. All your records are saved locally on your computer. If you enable Cloud Backup, a safe copy is uploaded to your own Google Drive. We don\'t read or sell your business data.'
  },
  {
    question: 'How do I take customer photos?',
    answer: 'If you have the Android app enabled, you simply open the app on your phone, point the camera at the customer or item, and it pairs instantly with your Windows desktop app to save the photo.'
  },
  {
    question: 'Is it hard to learn?',
    answer: 'Not at all. We designed LoanPro to be as easy to use as writing in a book. Most shop owners understand it within 10 minutes.'
  },
  {
    question: 'What if I need help or something goes wrong?',
    answer: 'You can create a Support Ticket directly from the app. It automatically sends us your recent app logs so we can fix your issue very fast. We also offer phone and email support.'
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription anytime. Your app will still work until the current month ends.'
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
                        Simple answers to common questions about using the app.
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
                                    className={`w-5 h-5 text-slate-500 transition-transform ${openFAQ === idx ? 'rotate-180' : ''
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
                            Give us a call or send an email if you need help with anything.
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