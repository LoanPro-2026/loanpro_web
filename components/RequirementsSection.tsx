import React from 'react';
import { 
  ComputerDesktopIcon, 
  FingerPrintIcon, 
  CloudIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

const requirements = [
  {
    title: 'Windows Operating System',
    description: 'Windows 10 or higher required for optimal performance',
    icon: ComputerDesktopIcon,
    gradient: 'from-blue-500 to-purple-500',
    bgGradient: 'from-blue-50 to-purple-50',
    required: true
  },
  {
    title: 'Secu-Hamster Pro 20-AP Fingerprint Scanner',
    description: 'Essential for Pro and Enterprise users to enable biometric authentication features',
    icon: FingerPrintIcon,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
    required: true,
    highlight: true
  },
  {
    title: 'Internet Connection',
    description: 'Required for cloud synchronization and software updates',
    icon: CloudIcon,
    gradient: 'from-pink-500 to-red-500',
    bgGradient: 'from-pink-50 to-red-50',
    required: true
  }
];

const RequirementsSection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            System Requirements
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ensure you have the necessary hardware and software to get the most out of LoanPro
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {requirements.map((requirement, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-2 ${
                requirement.highlight 
                  ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50' 
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              {requirement.highlight && (
                <div className="absolute -top-3 -right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>IMPORTANT</span>
                </div>
              )}
              
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${requirement.gradient} mb-6 shadow-lg`}>
                <requirement.icon className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-gray-800">
                {requirement.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed mb-6">
                {requirement.description}
              </p>

              {requirement.required && (
                <div className="inline-flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Required</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-3xl p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="w-12 h-12 text-yellow-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Important Notice for Pro & Enterprise Users
          </h3>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            <strong>Secu-Hamster Pro 20-AP Fingerprint Scanner</strong> is mandatory for Pro and Enterprise plan users 
            to access biometric authentication features. This hardware ensures secure user verification and 
            enhanced data protection for your loan management operations.
          </p>
        </div>
      </div>
    </section>
  );
};

export default RequirementsSection;
