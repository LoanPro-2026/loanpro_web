import React from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';
import { CheckIcon, StarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const plans = [
  {
    name: 'Basic',
    price: '₹699',
    originalPrice: '₹899',
    period: '/month',
    description: 'Essential features for small loan businesses',
    features: [
      'All core features included',
      'Limited customer support',
      'Single device support only',
      'No cloud facility',
      'No biometric authentication',
      'Local data storage',
      'Basic analytics dashboard',
      'Standard templates'
    ],
    popular: false,
    gradient: 'from-blue-500 to-blue-600',
    bgGradient: 'from-blue-50 to-blue-100'
  },
  {
    name: 'Pro',
    price: '₹999',
    originalPrice: '₹1,299',
    period: '/month',
    description: 'Most popular choice for growing loan businesses',
    features: [
      'All features included',
      'Limited cloud database (1GB)',
      'Biometrics Available ',
      'Daily automatic sync',
      'Advanced analytics & reports',
      'Priority support',
      'Single device support'
    ],
    popular: true,
    gradient: 'from-purple-500 to-purple-600',
    bgGradient: 'from-purple-50 to-purple-100'
  },
  {
    name: 'Enterprise',
    price: '₹1,699',
    originalPrice: '₹1,999',
    period: '/month',
    description: 'Complete solution for large organizations',
    features: [
      'All features included',
      'Unlimited cloud support',
      'Dual device support (2 devices)',
      'Custom sync enabled',
      'Biometric authentication',
      'White-label solution',
      '24/7 phone support',
      'Dedicated Cloud Credit manager'
    ],
    popular: false,
    gradient: 'from-pink-500 to-pink-600',
    bgGradient: 'from-pink-50 to-pink-100',
    comingSoon: true
  }
];

const PricingSection = () => (
  <section className="relative py-24 overflow-hidden" id="pricing">
    {/* Background Elements */}
    <div className="absolute inset-0 bg-gradient-to-br from-white via-purple-50 to-blue-50"></div>
    <div className="absolute top-1/4 left-0 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
    <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
    
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center space-x-2 bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-6 py-2 mb-6">
          <StarIcon className="w-5 h-5 text-yellow-500" />
          <span className="text-purple-600 font-semibold">Transparent Pricing</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Choose Your 
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Perfect Plan</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Simple, transparent pricing with no hidden fees. All plans include our core features with varying levels of support and customization.
        </p>
        
        {/* Free Trial Banner */}
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 rounded-full px-6 py-2 mb-8">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-700 font-medium">🎉 Start with 14-day FREE Pro trial - No credit card required!</span>
        </div>
        
        {/* Free Trial Button */}
        <div className="mb-12 flex justify-center">
          <SignedOut>
            <Link href="/subscribe">
              <button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2">
                <span>Start 14 days free trial Now</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/subscribe">
              <button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2">
                <span>Start 14 days free trial Now</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </Link>
          </SignedIn>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {plans.map((plan, idx) => (
          <div 
            key={idx} 
            className={`relative group ${plan.popular ? 'scale-105 z-10' : ''}`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </div>
              </div>
            )}

            {/* Coming Soon Badge */}
            {plan.comingSoon && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                  Coming Soon
                </div>
              </div>
            )}

            <div className="relative bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-8 hover:bg-white/30 transition-all duration-500 hover:scale-105 shadow-2xl">
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${plan.bgGradient} opacity-0 group-hover:opacity-20 rounded-3xl transition-opacity duration-500`}></div>
              
              <div className="relative">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600">{plan.period}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-lg text-gray-400 line-through">{plan.originalPrice}</span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                        Save {Math.round((1 - parseInt(plan.price.replace('₹', '').replace(',', '')) / parseInt(plan.originalPrice.replace('₹', '').replace(',', ''))) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIdx) => (
                    <div key={featureIdx} className="flex items-center space-x-3">
                      <div className={`w-5 h-5 bg-gradient-to-r ${plan.gradient} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <CheckIcon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button 
                      className={`w-full ${plan.comingSoon 
                        ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                        : `bg-gradient-to-r ${plan.gradient}`
                      } text-white font-bold py-4 px-6 rounded-2xl shadow-lg ${plan.comingSoon 
                        ? '' 
                        : 'hover:shadow-xl transform hover:scale-105'
                      } transition-all duration-300 flex items-center justify-center space-x-2`}
                      disabled={plan.comingSoon}
                    >
                      <span>{plan.comingSoon ? 'Coming Soon' : 'Get Started'}</span>
                      {!plan.comingSoon && <ArrowRightIcon className="w-5 h-5" />}
                    </button>
                  </SignUpButton>
                </SignedOut>

                <SignedIn>
                  <Link href={plan.comingSoon ? '#' : '/subscribe'}>
                    <button 
                      className={`w-full ${plan.comingSoon 
                        ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                        : `bg-gradient-to-r ${plan.gradient}`
                      } text-white font-bold py-4 px-6 rounded-2xl shadow-lg ${plan.comingSoon 
                        ? '' 
                        : 'hover:shadow-xl transform hover:scale-105'
                      } transition-all duration-300 flex items-center justify-center space-x-2`}
                      disabled={plan.comingSoon}
                    >
                      <span>{plan.comingSoon ? 'Coming Soon' : 'Choose Plan'}</span>
                      {!plan.comingSoon && <ArrowRightIcon className="w-5 h-5" />}
                    </button>
                  </Link>
                </SignedIn>
              </div>

              {/* Hover Effect */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${plan.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10`}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="text-center">
        <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Need a Custom Solution?
          </h3>
          <p className="text-gray-600 mb-6">
            We offer tailored enterprise solutions with custom features, integrations, and dedicated support for large organizations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button className="bg-white/30 hover:bg-white/40 text-gray-700 font-semibold px-6 py-3 rounded-xl border border-white/40 transition-all duration-300">
              Contact Sales
            </button>
            <Link href="/download">
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                Try Free Demo
              </button>
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            💡 14-day FREE Pro trial available • No setup fees • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default PricingSection; 