import React from 'react';

const steps = [
  {
    title: 'Sign Up',
    description: 'Create your account in seconds using your email or social login.',
    icon: '📝',
  },
  {
    title: 'Choose Plan',
    description: 'Select the subscription plan that fits your business needs.',
    icon: '💳',
  },
  {
    title: 'Set Up Dashboard',
    description: 'Get your own subdomain and configure your lending dashboard.',
    icon: '🖥️',
  },
  {
    title: 'Start Lending',
    description: 'Add customers, manage loans, and collect payments effortlessly.',
    icon: '🚀',
  },
];

const OnboardingSection = () => (
  <section className="py-20 bg-gradient-to-b from-white to-blue-50" id="onboarding">
    <div className="max-w-6xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold mb-12 text-blue-700">How to Onboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        {steps.map((step, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-blue-100 hover:border-blue-600 transition">
            <div className="text-5xl mb-4">{step.icon}</div>
            <h3 className="text-xl font-bold mb-2 text-blue-800">{step.title}</h3>
            <p className="text-gray-600">{step.description}</p>
            {idx < steps.length - 1 && (
              <div className="mt-6 text-blue-300 text-3xl">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default OnboardingSection; 