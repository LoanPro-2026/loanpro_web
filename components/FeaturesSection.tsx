import React from 'react';
import {
  ChartBarIcon,
  CameraIcon,
  CloudIcon,
  CreditCardIcon,
  ServerIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    title: 'Operational Dashboard',
    icon: ChartBarIcon,
    description: 'Track daily disbursements, collections, overdue exposure, and portfolio movement from one control center.',
  },
  {
    title: 'Photo Verification',
    icon: CameraIcon,
    description: 'Capture customer photos with the Android companion and verify identity during repayment, closure, or dispute checks.',
  },
  {
    title: 'Cloud Sync & Backup',
    icon: CloudIcon,
    description: 'Schedule backup cycles and keep recoverable copies so teams can restore quickly after system changes or failures.',
  },
  {
    title: 'Cashflow Tracking',
    icon: CreditCardIcon,
    description: 'Record deposits, repayments, withdrawals, and adjustments with a clear transaction trail and day-end visibility.',
  },
  {
    title: 'Local-First Storage',
    icon: ServerIcon,
    description: 'Local-first architecture keeps front-desk operations fast and dependable even on unstable internet connections.',
  },
  {
    title: 'Portfolio Intelligence',
    icon: ShieldCheckIcon,
    description: 'Review exposure, repayment trends, and performance signals to make better collection and lending decisions daily.',
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-16 bg-white" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-semibold text-slate-600">
            Features
          </div>
          <h2 className="mt-5 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
            Everything required for disciplined loan operations
          </h2>
          <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
            From loan entry to closure, LoanPro combines speed, control, and audit-ready workflows for growing lending teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <IconComponent className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection; 