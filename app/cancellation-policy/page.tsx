import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cancellation Policy | LoanPro',
    description: 'Cancellation and access policy for LoanPro subscriptions and trials.'
};

const sections = [
    {
        title: '1. How to Cancel',
        content:
            'You can cancel your subscription anytime simply by calling or emailing our support team, or through your account settings.'
    },
    {
        title: '2. Trial Accounts',
        content:
            'If you are on a free trial, you can choose to not continue at the end of the month. You do not need to do anything special to cancel a free trial.'
    },
    {
        title: '3. Paid Accounts',
        content:
            'If you paid for a month or year, your app will keep working until that time is finished. After that, your access will stop unless you renew.'
    },
    {
        title: '4. Refunds',
        content:
            'We generally do not offer refunds because you can pay very low monthly fees and try the app for free for 1 month first.'
    },
    {
        title: '5. Your Business Records',
        content:
            'Because LoanPro saves data directly to your computer, cancelling your subscription does not delete your old records from your computer. You just will not be able to use the app to make new entries until you subscribe again.'
    }
];

export default function CancellationPolicyPage() {
    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                    <h1 className="text-3xl font-semibold text-slate-900">Cancellation Policy</h1>
                    <p className="mt-3 text-sm text-slate-600">Effective date: March 20, 2026</p>
                    <p className="mt-4 text-slate-700">
                        Our rules on cancelling your subscription are simply written below.
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
                        For cancellation support, contact support@loanpro.tech with your registered account details.
                    </div>
                </div>
            </div>
        </div>
    );
}
