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
        title: 'Daily Dashboard',
        icon: ChartBarIcon,
        description: 'Track your daily loans given out, money collected, and total cash in one simple screen.',
    },
    {
        title: 'Customer Photos',
        icon: CameraIcon,
        description: 'Easily take photos of customers and the gold/silver items using our companion Android app.',
    },
    {
        title: 'Safe Data Backup',
        icon: CloudIcon,
        description: 'Your shop records are kept completely safe with automatic backups to the cloud or Google Drive.',
    },
    {
        title: 'Cash Tracking',
        icon: CreditCardIcon,
        description: 'Quickly record every cash deposit, payment, and withdrawal. Avoid calculation mistakes at the end of the day.',
    },
    {
        title: 'Works Offline',
        icon: ServerIcon,
        description: 'The Windows app works perfectly fast even if your shop internet goes down. No delays while serving customers.',
    },
    {
        title: 'Simple Reports',
        icon: ShieldCheckIcon,
        description: 'View simple, easy-to-read reports to see who owes you money and what your profits are.',
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
                        Everything you need to run your lending shop
                    </h2>
                    <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
                        LoanPro gives you speed and peace of mind. Manage your gold/silver loans without the headache of paper registers.
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