import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | LoanPro',
    description: 'Privacy Policy for LoanPro users and website visitors.'
};

const sections = [
    {
        title: '1. Information We Collect',
        content:
            'We collect account information, contact details, subscription and billing data, support request details, and technical diagnostics required for service delivery.'
    },
    {
        title: '2. How We Use Information',
        content:
            'We use information to operate services, provide support, process subscriptions, improve reliability, and communicate important account and security updates.'
    },
    {
        title: '3. Data Storage and Processing',
        content:
            'LoanPro follows a local-first operational model for core desktop workflows. Cloud and web services process data required for account, backup, and support features based on your plan and configuration.'
    },
    {
        title: '4. Sharing of Information',
        content:
            'We do not sell your personal information. We may share data with payment providers, infrastructure vendors, and legally required authorities only as needed for service operations and compliance.'
    },
    {
        title: '5. Data Security',
        content:
            'We implement technical and organizational safeguards to protect account and service data. You are responsible for securing your endpoint systems, credentials, and local infrastructure.'
    },
    {
        title: '6. Data Retention',
        content:
            'We retain data for as long as needed to provide services, meet legal obligations, resolve disputes, and enforce agreements, after which data is deleted or anonymized where practical.'
    },
    {
        title: '7. Your Rights',
        content:
            'You may request access, correction, or deletion of personal data where applicable by law. We may require identity verification before fulfilling data requests.'
    },
    {
        title: '8. Cookies and Analytics',
        content:
            'Our web services may use essential cookies and analytics to improve user experience, performance, and security monitoring.'
    },
    {
        title: '9. Policy Updates',
        content:
            'We may revise this policy periodically. Significant changes will be reflected on this page with an updated effective date.'
    }
];

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                    <h1 className="text-3xl font-semibold text-slate-900">Privacy Policy</h1>
                    <p className="mt-3 text-sm text-slate-600">Effective date: March 20, 2026</p>
                    <p className="mt-4 text-slate-700">
                        This policy explains how LoanPro collects, uses, and safeguards your information when you use our products and services.
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
                        Privacy requests can be sent to support@loanpro.tech.
                    </div>
                </div>
            </div>
        </div>
    );
}
