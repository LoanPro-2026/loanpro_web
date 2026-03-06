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
    title: 'Personalized DashBoard',
    icon: ChartBarIcon,
    description: 'Comprehensive analytics and reporting with real-time insights into your lending operations and portfolio performance.',
  },
  {
    title: 'Photo Verification',
    icon: CameraIcon,
    description: 'Capture and view customer photos while adding or removing records using your Android phone as a companion camera.',
  },
  {
    title: 'Cloud Sync & Backup',
    icon: CloudIcon,
    description: 'Seamless synchronization between local storage and cloud storage for data backup and safety.',
  },
  {
    title: 'Cashflow Tracking',
    icon: CreditCardIcon,
    description: 'Track daily cash flow, deposits, withdrawals, and maintain accurate financial records with automated reporting.',
  },
  {
    title: 'Local-First Storage',
    icon: ServerIcon,
    description: 'Local database with encryption for sensitive loan data storage and fast query performance.',
  },
  {
    title: 'Secure Operations',
    icon: ShieldCheckIcon,
    description: 'Monitor loan portfolios, track returns, and analyze investment performance with detailed reporting.',
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
            Everything you need to run loans at scale
          </h2>
          <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
            LoanPro combines local-first performance with the controls and reporting needed by professional lending teams.
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