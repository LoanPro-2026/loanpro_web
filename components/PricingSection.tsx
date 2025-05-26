import React from 'react';
import Link from 'next/link';

const PricingSection = () => (
  <section className="py-20 bg-gradient-to-b from-blue-50 to-white" id="pricing">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold mb-8 text-blue-700">Simple, Transparent Pricing</h2>
      <p className="mb-8 text-lg text-gray-700 max-w-2xl mx-auto">
        Choose the perfect plan for your business. All features included in every plan. 
        Monthly, 6-month, or yearly billing options available.
      </p>
      
      <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-100">
        <h3 className="text-2xl font-bold text-blue-700 mb-4">Starting at ₹1,249/month</h3>
        <p className="text-gray-600 mb-8">
          All plans include unlimited customers, free subdomain, priority support, and full access to all features.
        </p>
        <Link 
          href="/subscribe" 
          className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold text-lg"
        >
          View All Plans
        </Link>
        <p className="mt-4 text-sm text-gray-500">Cancel anytime. No questions asked.</p>
      </div>
    </div>
  </section>
);

export default PricingSection; 