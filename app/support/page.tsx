'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type InquiryType =
  | 'sales'
  | 'demo-request'
  | 'pricing'
  | 'application-setup'
  | 'partnership'
  | 'other';

const inquiryOptions: Array<{ value: InquiryType; label: string }> = [
  { value: 'sales', label: 'Sales' },
  { value: 'demo-request', label: 'Demo Request' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'application-setup', label: 'Application Setup' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' }
];

export default function SupportPage() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    inquiryType: 'sales' as InquiryType,
    preferredCallbackTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    message: '',
    consentAccepted: false,
    website: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [requestId, setRequestId] = useState('');
  const messageLength = formData.message.trim().length;

  useEffect(() => {
    const inquiryType = searchParams.get('inquiryType') as InquiryType | null;
    const email = searchParams.get('email') || '';
    const name = searchParams.get('name') || '';
    const phone = searchParams.get('phone') || '';
    const organization = searchParams.get('organization') || '';
    const message = searchParams.get('message') || '';

    setFormData((prev) => ({
      ...prev,
      inquiryType: inquiryType && inquiryOptions.some((opt) => opt.value === inquiryType) ? inquiryType : prev.inquiryType,
      email: email || prev.email,
      name: name || prev.name,
      phone: phone || prev.phone,
      organization: organization || prev.organization,
      message: message || prev.message,
    }));
  }, [searchParams]);

  const isSubmitDisabled = useMemo(() => {
    return (
      submitting ||
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.organization.trim() ||
      messageLength < 10 ||
      !formData.consentAccepted
    );
  }, [formData, messageLength, submitting]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setRequestId('');

    if (formData.website.trim().length > 0) {
      setError('Submission failed. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setError(payload.error || 'Unable to submit your request right now.');
        return;
      }

      setRequestId(payload.request?.requestId || '');
      setSuccessMessage(
        payload.message || 'Thanks! Our team will call you within 24 business hours.'
      );

      setFormData((prev) => ({
        ...prev,
        name: '',
        email: '',
        phone: '',
        organization: '',
        inquiryType: 'sales',
        preferredCallbackTime: '',
        message: '',
        consentAccepted: false,
        website: ''
      }));
    } catch (submitError) {
      setError('Unable to submit your request right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Contact Us</h1>
          <p className="text-slate-600 mb-6">
            Tell us about your sales or application requirements. Our team will review your details and call you to discuss the next steps.
          </p>

          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            After you submit this form, our team will call you within 24 business hours.
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <p>{successMessage}</p>
              {requestId && <p className="mt-1 font-semibold">Reference ID: {requestId}</p>}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Work Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="tel"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Include country code for faster callback scheduling.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inquiry Type</label>
                <select
                  value={formData.inquiryType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, inquiryType: e.target.value as InquiryType }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {inquiryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Callback Time (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2 PM - 5 PM IST"
                  value={formData.preferredCallbackTime}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, preferredCallbackTime: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Timezone (Optional)</label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={2000}
                required
              />
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className={messageLength < 10 ? 'text-amber-600' : 'text-slate-500'}>
                    {messageLength < 10 ? 'Please add at least 10 characters.' : 'Looks good.'}
                  </span>
                  <span className="text-slate-400">{messageLength}/2000</span>
                </div>
            </div>

            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formData.consentAccepted}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, consentAccepted: e.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                required
              />
              <span>
                I agree to be contacted by LoanPro team via phone and email regarding this inquiry.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>

            <p className="text-xs text-slate-500">
              Typical callback window: Monday–Saturday, 10:00 AM to 7:00 PM IST.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}