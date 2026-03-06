import React from 'react';
import {
  ArrowDownTrayIcon,
  KeyIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const setupSteps = [
  {
    step: 1,
    title: 'Install the desktop app',
    description: 'Download LoanPro for Windows and complete the guided installation in minutes.',
    icon: ArrowDownTrayIcon
  },
  {
    step: 2,
    title: 'Connect your account',
    description: 'Enter any Device Name, Organization Name , copy your access token from Profile, and authenticate the desktop app.',
    icon: KeyIcon
  },
  {
    step: 3,
    title: 'Enable Android photo capture',
    description: 'Pair your Android phone and allow camera access so you can capture customer photos while adding and removing records.',
    icon: DevicePhoneMobileIcon
  }
];

interface HowToSetupProps {
  showTitle?: boolean;
  variant?: 'default' | 'compact';
}

const HowToSetup: React.FC<HowToSetupProps> = ({ showTitle = true, variant = 'default' }) => {
  return (
    <section className={`py-16 bg-slate-50 ${variant === 'compact' ? 'py-12' : ''}`} id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showTitle && (
          <div className="text-center mb-14">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600">
              How it works
            </div>
            <h2 className="mt-5 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
              Get started in three simple steps
            </h2>
            <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
              Install the desktop app, connect your account, and configure your workspace and start using.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {setupSteps.map((step, index) => (
            <div
              key={index}
              className="relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
            >
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-md">
                {step.step}
              </div>

              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-5">
                <step.icon className="w-6 h-6" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-slate-900">
                {step.title}
              </h3>
              
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowToSetup;
