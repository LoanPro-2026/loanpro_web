import React from 'react';
import { 
  ArrowDownTrayIcon, 
  KeyIcon, 
  CogIcon, 
  FingerPrintIcon, 
  CheckCircleIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const setupSteps = [
  {
    step: 1,
    title: 'Download the Desktop App',
    description: 'Download and install the LoanPro desktop application on your Windows computer',
    icon: ArrowDownTrayIcon,
    gradient: 'from-blue-500 to-purple-500',
    bgGradient: 'from-blue-50 to-purple-50',
    action: 'Download Now'
  },
  {
    step: 2,
    title: 'Copy Access Token',
    description: 'Go to your profile page, copy the access token and enter it into the app to authenticate',
    icon: KeyIcon,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
    action: 'Get Token'
  },
  {
    step: 3,
    title: 'Database Setup',
    description: 'Navigate to Settings → Database Setup & Configuration, then click "Install Setup"',
    icon: CogIcon,
    gradient: 'from-pink-500 to-red-500',
    bgGradient: 'from-pink-50 to-red-50',
    action: 'Configure DB'
  },
  {
    step: 4,
    title: 'Fingerprint Setup',
    description: 'Go to Settings → Fingerprint Setup and run the biometric scanner configuration',
    icon: FingerPrintIcon,
    gradient: 'from-red-500 to-orange-500',
    bgGradient: 'from-red-50 to-orange-50',
    action: 'Setup Scanner'
  },
  {
    step: 5,
    title: 'Ready to Go!',
    description: 'Your LoanPro application is now fully configured and ready for use',
    icon: CheckCircleIcon,
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-50 to-emerald-50',
    action: 'Start Using'
  }
];

interface HowToSetupProps {
  showTitle?: boolean;
  variant?: 'default' | 'compact';
}

const HowToSetup: React.FC<HowToSetupProps> = ({ showTitle = true, variant = 'default' }) => {
  return (
    <section className={`py-20 bg-gradient-to-br from-gray-50 to-white ${variant === 'compact' ? 'py-12' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showTitle && (
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              How to Get Started
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Follow these simple steps to set up your LoanPro application and start managing your loans efficiently
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {setupSteps.map((step, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-gray-200"
            >
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                {step.step}
              </div>

              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${step.gradient} mb-6 shadow-lg`}>
                <step.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-gray-800">
                {step.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed mb-6 text-sm">
                {step.description}
              </p>

              {/* Action Button */}
              <div className="inline-flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                <PlayIcon className="w-4 h-4" />
                <span>{step.action}</span>
              </div>

              {/* Connection Line */}
              {index < setupSteps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400 transform -translate-y-1/2"></div>
              )}
            </div>
          ))}
        </div>

        {/* Important Note */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-3xl p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <FingerPrintIcon className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Biometric Setup Required
          </h3>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            For Pro and Enterprise users, ensure your <strong>Secu-Hamster Pro 20-AP Fingerprint Scanner</strong> is 
            connected before proceeding with Step 4. This is essential for accessing biometric authentication features.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowToSetup;
