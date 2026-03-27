import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cancellation Policy | LoanPro',
  description: 'Cancellation and access policy for LoanPro subscriptions and trials.'
};

const sections = [
  {
    title: '1. Cancellation Requests',
    content:
      'Users may request cancellation through supported account workflows or support channels. Requests are recorded with a reference ID for tracking.'
  },
  {
    title: '2. Trial Cancellation',
    content:
      'Trial access can be cancelled at any time. Cancellation may deactivate product access and related trial entitlements.'
  },
  {
    title: '3. Paid Subscription Cancellation',
    content:
      'Paid subscriptions may be cancelled according to the active billing cycle and service terms. Access behavior after cancellation follows current account policy rules.'
  },
  {
    title: '4. Refund Consideration',
    content:
      'Where applicable, refund amounts are evaluated based on usage period, billing details, and payment processing deductions under current policy terms.'
  },
  {
    title: '5. Data Responsibility',
    content:
      'Before cancellation, users should ensure required exports and backups are completed according to internal retention and compliance requirements.'
  },
  {
    title: '6. Processing Timeline',
    content:
      'Cancellation requests are reviewed in business order and priority. Additional verification may be required for payment-linked actions.'
  },
  {
    title: '7. Policy Updates',
    content:
      'This policy may be revised periodically. Updated terms apply from the effective date listed on this page.'
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
            This policy defines how cancellation requests are handled for trial and paid subscription access.
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
