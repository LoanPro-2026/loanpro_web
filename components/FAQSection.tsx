'use client';

import React, { useState } from 'react';
import { ChevronDownIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: 'What is LoanPro and how does it work?',
    answer: 'LoanPro is a comprehensive loan management platform that combines desktop application power with cloud connectivity. It features advanced analytics, secure data management, automated payments, and biometric authentication. Our hybrid architecture ensures your data is both secure locally and accessible from anywhere.',
    category: 'General'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Absolutely! You can cancel your subscription at any time with no questions asked. There are no hidden fees, cancellation charges, or long-term commitments. Your data remains accessible during your billing period and can be exported if needed.',
    category: 'Billing'
  },
  {
    question: 'What features are included in each plan?',
    answer: 'All our plans include core features like customer management, payment processing, and cloud backup. Higher tiers add advanced analytics, custom branding, API access, biometric authentication, and priority support. Check our pricing section for detailed feature comparisons.',
    category: 'Features'
  },
  {
    question: 'How secure is my data with LoanPro?',
    answer: 'Security is our top priority. We use military-grade AES-256 encryption, biometric authentication, multi-factor authentication, and SOC 2 Type II compliance. Your data is stored both locally and in secure cloud servers with regular automated backups.',
    category: 'Security'
  },
  {
    question: 'Do you offer customer support?',
    answer: 'Yes! We provide multiple support channels including email (support@loanpro.tech), phone (+91 12345 67890), live chat, and comprehensive documentation. Premium plans include priority support with faster response times.',
    category: 'Support'
  },
  {
    question: 'Can I integrate LoanPro with my existing systems?',
    answer: 'Absolutely! LoanPro offers robust API integrations for payment gateways, accounting software, CRM systems, and more. Our technical team can assist with custom integrations for enterprise clients.',
    category: 'Integration'
  },
  {
    question: 'Is there a free trial available?',
    answer: 'Yes, we offer a 14-day free trial with full access to all features. No credit card required to start. You can explore the platform completely before making any commitment.',
    category: 'Trial'
  },
  {
    question: 'How does the hybrid database system work?',
    answer: 'Our hybrid system stores your primary data locally for fast access and performance, while maintaining secure cloud backups for accessibility and disaster recovery. This gives you the best of both worlds - speed and security.',
    category: 'Technical'
  }
];

const categories = ['All', 'General', 'Billing', 'Features', 'Security', 'Support', 'Integration', 'Trial', 'Technical'];

const FAQSection = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredFAQs = activeCategory === 'All' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <section className="relative py-24 overflow-hidden" id="faq">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-white"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-6 py-2 mb-6">
            <QuestionMarkCircleIcon className="w-5 h-5 text-purple-600" />
            <span className="text-purple-600 font-semibold">FAQ</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Frequently Asked 
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Questions</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions about LoanPro's features, pricing, security, and more. 
            Can't find what you're looking for? Contact our support team.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === category
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'bg-white/30 backdrop-blur-sm border border-white/40 text-gray-700 hover:bg-white/40'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map((faq, idx) => (
            <div 
              key={idx} 
              className="group bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl overflow-hidden hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full px-8 py-6 text-left flex items-center justify-between focus:outline-none"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                    {faq.question}
                  </h3>
                </div>
                <ChevronDownIcon 
                  className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${
                    openFAQ === idx ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              
              {openFAQ === idx && (
                <div className="px-8 pb-6">
                  <div className="pl-6 border-l-2 border-gradient-to-b border-purple-200">
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                    <div className="mt-4">
                      <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                        {faq.category}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Still Have Questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Our support team is here to help you get the most out of LoanPro. 
              Reach out anytime for personalized assistance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <a 
                href="mailto:support@loanpro.tech"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Contact Support
              </a>
              <a 
                href="tel:+911234567890"
                className="bg-white/30 hover:bg-white/40 text-gray-700 font-semibold px-8 py-3 rounded-xl border border-white/40 transition-all duration-300"
              >
                Call Us
              </a>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              📞 Available Monday-Friday, 9 AM - 6 PM IST
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection; 