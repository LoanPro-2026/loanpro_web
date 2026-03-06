import React from 'react';
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

const requirements = [
  {
    title: 'Windows Operating System',
    description: 'Windows 10 or later for optimal stability and updates.',
    icon: ComputerDesktopIcon,
    required: true
  },
  {
    title: 'Android Phone With Camera',
    description: 'Required for mobile photo capture so shop owners can add and verify customer photos from their own phone.',
    icon: DevicePhoneMobileIcon,
    required: true
  },
  {
    title: 'Internet Connection',
    description: 'Needed for cloud backup, license checks, and updates.',
    icon: CloudIcon,
    required: true
  }
];

const RequirementsSection = () => {
  return (
    <section className="py-16 bg-white" id="requirements">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-semibold text-slate-600">
            Requirements
          </div>
          <h2 className="mt-5 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
            System requirements
          </h2>
          <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
            A simple checklist to ensure the desktop app runs smoothly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {requirements.map((requirement, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-5">
                <requirement.icon className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                {requirement.title}
              </h3>
              
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                {requirement.description}
              </p>

              {requirement.required && (
                <div className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Required
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RequirementsSection;
