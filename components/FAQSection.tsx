import React from 'react';

const faqs = [
  {
    question: 'What is LoanPro?',
    answer: 'LoanPro is a modern SaaS platform for effortless, secure, and scalable loan management for lenders of all sizes.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time. There are no hidden fees or lock-ins.'
  },
  {
    question: 'Are all features included in every plan?',
    answer: 'Absolutely! Every plan includes all features, unlimited customers, and priority support.'
  },
  {
    question: 'How do I get support?',
    answer: 'You can reach our support team via email at support@loanpro.tech or by phone at +91 12345 67890.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we use industry-standard security practices, including secure authentication and encrypted data storage.'
  },
];

const FAQSection = () => (
  <section className="py-20 bg-gradient-to-b from-blue-50 to-white" id="faq">
    <div className="max-w-4xl mx-auto px-4">
      <h2 className="text-4xl font-bold text-center mb-12 text-blue-700">Frequently Asked Questions</h2>
      <div className="space-y-6">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow p-6 border border-blue-100">
            <div className="font-semibold text-lg text-blue-700 mb-2">{faq.question}</div>
            <div className="text-gray-700">{faq.answer}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FAQSection; 