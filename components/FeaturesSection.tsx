import React from 'react';

const features = [
  {
    title: 'Fast Onboarding',
    description: 'Sign up and start managing loans in minutes.',
    icon: '🚀',
  },
  {
    title: 'Secure Authentication',
    description: 'Cloud Authentication powered login for robust security.',
    icon: '🔒',
  },
  {
    title: 'Automated Payments',
    description: 'Integrated with cutting edge payment gateway for seamless collections.',
    icon: '💳',
  },
  {
    title: 'Subdomain for Every User',
    description: 'Personalized dashboard at your own Name.',
    icon: '🌐',
  },
  {
    title: 'Hybrid Database',
    description: 'Local DataStorage with Cloud Access.',
    icon: '🗄️',
  },
  {
    title: 'Fingerprint Integration',
    description: 'Biometric verification for added security.',
    icon: '🧬',
  },
];

const FeaturesSection = () => (
  <section className="py-20 bg-gradient-to-b from-white to-blue-50" id="features">
    <div className="max-w-6xl mx-auto px-4">
      <h2 className="text-4xl font-bold text-center mb-12 text-blue-700">Why Choose LoanPro?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {features.map((feature, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-blue-100 hover:border-blue-600 transition">
            <div className="text-5xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-2 text-blue-800">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection; 