import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | LoanPro',
    description: 'Terms of Service for LoanPro desktop and web services.'
};

const sections = [
    {
        title: '1. Acceptance of Terms',
        content:
            'By accessing or using LoanPro services, you agree to these Terms of Service. If you do not agree, do not use the service.'
    },
    {
        title: '2. Service Scope',
        content:
            'LoanPro provides loan operations software, including desktop and web account services. Feature availability may vary by plan and deployment setup.'
    },
    {
        title: '3. Account Responsibility',
        content:
            'You are responsible for maintaining the confidentiality of your account credentials and for all activity performed under your account.'
    },
    {
        title: '4. Acceptable Use',
        content:
            'You must use LoanPro only for lawful business purposes. Misuse, abuse, unauthorized access attempts, and fraudulent activities are prohibited.'
    },
    {
        title: '5. Subscription and Billing',
        content:
            'Paid plans are billed according to your selected billing cycle. Plan prices, inclusions, and limits are shown at checkout and may be updated with prior notice.'
    },
    {
        title: '6. Data and Backups',
        content:
            'LoanPro uses a local-first operational model. Backup responsibility depends on your plan and configuration. You are responsible for verifying your backup setup and retention requirements.'
    },
    {
        title: '7. Availability and Support',
        content:
            'We aim to provide reliable service and timely support. Response and resolution times may vary based on request priority, business hours, and incident complexity.'
    },
    {
        title: '8. Suspension or Termination',
        content:
            'We may suspend or terminate access for violation of these terms, fraudulent activity, or abuse of services. You may discontinue use at any time subject to plan and policy conditions.'
    },
    {
        title: '9. Limitation of Liability',
        content:
            'To the maximum extent permitted by law, LoanPro is not liable for indirect, incidental, or consequential losses arising from service use, downtime, or data handling outside our control.'
    },
    {
        title: '10. Changes to Terms',
        content:
            'We may update these terms from time to time. Continued use of the service after updates means you accept the revised terms.'
    }
];

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                    <h1 className="text-3xl font-semibold text-slate-900">Terms of Service</h1>
                    <p className="mt-3 text-sm text-slate-600">
                        Effective date: March 20, 2026
                    </p>
                    <p className="mt-4 text-slate-700">
                        These terms govern your use of LoanPro products and services. Please read them carefully before using the platform.
                    </p>

                    <div className="mt-8 space-y-6">
                        {sections.map((section) => (
                            <section key={section.title}>
                                <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{section.content}</p>
                            </section>
                        ))}
                    </div>

                    <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        For questions about these terms, contact us at support@loanpro.tech.
                    </div>
                </div>
            </div>
        </div>
    );
}
