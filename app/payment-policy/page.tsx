import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Policy | LoanPro',
  description: 'Payment, billing, and refund policy for LoanPro subscriptions.'
};

const sections = [
  {
    title: '1. Subscription Charges',
    content:
      'LoanPro plans are billed according to the plan and billing cycle selected at checkout. Charges are displayed before payment confirmation.'
  },
  {
    title: '2. Payment Methods',
    content:
      'Payments are processed through supported payment gateways. You must provide valid payment details and authorization for the selected transaction.'
  },
  {
    title: '3. Billing Confirmation',
    content:
      'After successful payment, transaction confirmation is provided through the application and/or registered communication channel.'
  },
  {
    title: '4. Failed or Disputed Payments',
    content:
      'If payment fails or is disputed, subscription activation or continuation may be delayed until payment status is resolved.'
  },
  {
    title: '5. Refund Eligibility',
    content:
      'Refund eligibility is assessed according to active cancellation and payment policy conditions, including service usage period and applicable gateway charges.'
  },
  {
    title: '6. Refund Timelines',
    content:
      'Approved refunds are initiated to the original payment method. Final credit timelines depend on payment partner and banking networks.'
  },
  {
    title: '7. Taxes and Fees',
    content:
      'Applicable taxes and payment processing charges may apply as per law and payment gateway terms.'
  },
  {
    title: '8. Policy Changes',
    content:
      'We may update this policy from time to time. Changes become effective when published on this page.'
  }
];

export default function PaymentPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Payment Policy</h1>
          <p className="mt-3 text-sm text-slate-600">Effective date: March 20, 2026</p>
          <p className="mt-4 text-slate-700">
            This policy explains billing, payment handling, and refund processing for LoanPro subscriptions.
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
            For payment or billing queries, contact support@loanpro.tech.
          </div>
        </div>
      </div>
    </div>
  );
}
