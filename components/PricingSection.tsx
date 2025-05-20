import React from 'react';

const plans = [
  {
    name: 'Monthly',
    price: 1249,
    period: 'month',
    description: 'Perfect for trying out LoanPro or for short-term needs. All features, no restrictions.'
  },
  {
    name: '6 Months',
    price: 5999,
    period: '6 months',
    description: 'Best value for growing businesses. Enjoy uninterrupted access and save more every cycle.'
  },
  {
    name: 'Yearly',
    price: 10799,
    period: 'year',
    description: 'For established lenders who want maximum savings and peace of mind all year long.'
  },
];

function formatINR(amount: number) {
  return amount.toLocaleString('en-IN');
}

const PricingSection = () => (
  <section className="py-20 bg-gradient-to-b from-blue-50 to-white" id="pricing">
    <div className="max-w-6xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold mb-8 text-blue-700">Choose Your Plan</h2>
      <p className="mb-8 text-lg text-gray-700 max-w-2xl mx-auto">
        All features are included in every plan. You will be billed according to the plan you select—monthly, every 6 months, or yearly. No hidden fees, no surprises.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-blue-100 hover:border-blue-600 transition">
            <h3 className="text-2xl font-bold text-blue-700 mb-2">{plan.name}</h3>
            <div className="text-4xl font-extrabold text-blue-800 mb-2">₹{formatINR(plan.price)}</div>
            <div className="text-gray-500 mb-4">per {plan.period}</div>
            <p className="text-gray-700 mb-6">{plan.description}</p>
            <ul className="text-gray-700 mb-6 text-left list-disc list-inside">
              <li>Unlimited customers & loans</li>
              <li>Free subdomain</li>
              <li>Priority support</li>
              <li>All features included</li>
            </ul>
            <button className="mt-auto px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold">Select Plan</button>
            <div className="mt-4 text-xs text-gray-500">Cancel anytime. No questions asked.</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection; 