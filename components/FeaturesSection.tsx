import React from 'react';
import { 
  RocketLaunchIcon, 
  LockClosedIcon, 
  CreditCardIcon, 
  GlobeAltIcon, 
  ServerIcon, 
  FingerPrintIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    title: 'Lightning Fast Setup',
    description: 'Get your loan management system up and running in under 5 minutes with our streamlined onboarding process.',
    icon: RocketLaunchIcon,
    gradient: 'from-blue-500 to-purple-500',
    bgGradient: 'from-blue-50 to-purple-50'
  },
  {
    title: 'Bank-Grade Security',
    description: 'Military-grade encryption with biometric authentication and multi-factor security protocols.',
    icon: LockClosedIcon,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50'
  },
  {
    title: 'Smart Payment Gateway',
    description: 'Integrated with cutting-edge payment systems for automated collections and real-time processing.',
    icon: CreditCardIcon,
    gradient: 'from-pink-500 to-red-500',
    bgGradient: 'from-pink-50 to-red-50'
  },
  {
    title: 'Personalized Subdomain',
    description: 'Your own branded dashboard with custom domain, giving you a professional presence.',
    icon: GlobeAltIcon,
    gradient: 'from-red-500 to-orange-500',
    bgGradient: 'from-red-50 to-orange-50'
  },
  {
    title: 'Hybrid Cloud Database',
    description: 'Best of both worlds - local storage for speed and cloud backup for security and accessibility.',
    icon: ServerIcon,
    gradient: 'from-orange-500 to-yellow-500',
    bgGradient: 'from-orange-50 to-yellow-50'
  },
  {
    title: 'Biometric Authentication',
    description: 'Advanced fingerprint integration for seamless and secure access to your sensitive data.',
    icon: FingerPrintIcon,
    gradient: 'from-yellow-500 to-green-500',
    bgGradient: 'from-yellow-50 to-green-50'
  },
  {
    title: 'Advanced Analytics',
    description: 'Comprehensive reporting and insights with AI-powered predictions for better decision making.',
    icon: ChartBarIcon,
    gradient: 'from-green-500 to-teal-500',
    bgGradient: 'from-green-50 to-teal-50'
  },
  {
    title: 'Compliance Ready',
    description: 'Built-in compliance tools ensuring your operations meet all regulatory requirements.',
    icon: ShieldCheckIcon,
    gradient: 'from-teal-500 to-cyan-500',
    bgGradient: 'from-teal-50 to-cyan-50'
  },
  {
    title: 'Cloud Integration',
    description: 'Seamless synchronization across all devices with real-time cloud backup and restore.',
    icon: CloudIcon,
    gradient: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50'
  },
];

const FeaturesSection = () => (
  <section className="relative py-24 overflow-hidden" id="features">
    {/* Background Elements */}
    <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50"></div>
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
    
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center space-x-2 bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-6 py-2 mb-6">
          <span className="text-blue-600 font-semibold">⚡ Features</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Why Choose 
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> LoanPro</span>?
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Discover the powerful features that make LoanPro the preferred choice for modern loan management professionals worldwide.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, idx) => {
          const IconComponent = feature.icon;
          return (
            <div 
              key={idx} 
              className="group relative bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 hover:bg-white/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl"
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>
              
              {/* Icon */}
              <div className="relative mb-6">
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300`}></div>
              </div>
              
              {/* Content */}
              <div className="relative">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Hover Effect Border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-20">
        <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Experience the Future of Loan Management?
          </h3>
          <p className="text-gray-600 mb-6">
            Join thousands of satisfied users who have transformed their loan operations with LoanPro.
          </p>
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            Start Your Free Trial
          </button>
        </div>
      </div>
    </div>
  </section>
);

export default FeaturesSection; 