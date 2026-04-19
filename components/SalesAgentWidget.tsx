'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChatBubbleBottomCenterTextIcon, PhoneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { trackEvent } from '@/lib/googleAnalytics';
import { getCurrentUtmParams, getVisitorId, trackFunnelEvent } from '@/lib/funnelTracking';
import { toUserFriendlyToastError } from '@/lib/toastErrorMessage';
import { fetchPublicSalesConfig, getFallbackSalesConfig, type PublicSalesConfig } from '@/lib/salesConfig';

type InquiryType =
  | 'sales'
  | 'demo-request'
  | 'pricing'
  | 'application-setup'
  | 'partnership'
  | 'other';

const inquiryOptions: Array<{ value: InquiryType; label: string }> = [
  { value: 'sales', label: 'Buying LoanPro' },
  { value: 'demo-request', label: 'App Demonstration' },
  { value: 'pricing', label: 'Pricing Questions' },
  { value: 'application-setup', label: 'Help Installing the App' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' },
];

export default function SalesAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [salesConfig, setSalesConfig] = useState<PublicSalesConfig>(getFallbackSalesConfig());
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: 'sales' as InquiryType,
    preferredCallbackTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    message: '',
    consentAccepted: true,
    website: '',
  });
  const messageLength = formData.message.trim().length;

  const isValid = useMemo(() => {
    return (
      formData.name.trim().length > 1 &&
      formData.email.trim().length > 4 &&
      formData.phone.trim().length >= 7 &&
      formData.consentAccepted
    );
  }, [formData]);

  useEffect(() => {
    void (async () => {
      const config = await fetchPublicSalesConfig();
      setSalesConfig(config);
    })();
  }, []);

  const toggleOpen = async () => {
    if (!salesConfig.salesWidgetEnabled) {
      return;
    }

    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen) {
      trackEvent('open_talk_to_agent_widget', { source: 'floating_widget' });
      await trackFunnelEvent('agent_widget_opened', { source: 'floating_widget' });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!isValid) {
      setError('Please fill all required fields first.');
      return;
    }

    if (formData.website.trim().length > 0) {
      setError('Unable to submit right now. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          message: formData.message.trim() || 'Need help with plans and callback guidance.',
          timezone: formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          source: 'talk_to_agent_widget',
          funnelStage: 'consideration',
          pagePath: window.location.pathname,
          visitorId: getVisitorId(),
          utm: getCurrentUtmParams(),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error || payload?.message || 'Unable to submit right now');
      }

      const leadRef = payload?.request?.requestId || '';
      setSuccess(leadRef ? `Request sent. Reference ID: ${leadRef}` : 'Request sent. Our team will call you shortly.');
      trackEvent('generate_lead', {
        lead_type: 'agent_widget',
        source: 'floating_widget',
      });

      await trackFunnelEvent('lead_submitted', {
        leadType: 'agent_widget',
        source: 'floating_widget',
        inquiryType: formData.inquiryType,
        hasPreferredCallbackTime: Boolean(formData.preferredCallbackTime.trim()),
      });

      setFormData({
        name: '',
        email: '',
        phone: '',
        inquiryType: 'sales',
        preferredCallbackTime: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        message: '',
        consentAccepted: true,
        website: '',
      });
    } catch (submitError) {
      const safeError = toUserFriendlyToastError(submitError);
      setError(safeError || 'Unable to submit your request right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-3 right-3 z-[70] sm:bottom-5 sm:right-5">
        <button
          type="button"
          onClick={toggleOpen}
          disabled={!salesConfig.salesWidgetEnabled}
          className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-5 sm:py-3"
        >
          {isOpen ? <XMarkIcon className="h-4 w-4" /> : <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />}
          {isOpen ? 'Close' : 'Need help?'}
        </button>
      </div>

      {isOpen && salesConfig.salesWidgetEnabled && (
        <aside className="fixed inset-x-2 bottom-20 top-2 z-[70] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-5 sm:top-auto sm:max-h-[calc(100dvh-8.5rem)] sm:w-[min(94vw,420px)] sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Talk to a Sales Agent</h3>
              <p className="mt-1 text-sm text-slate-600">
                Share your details and get a callback with plan recommendation and setup guidance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close support form"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4">
            <a
              href={`tel:${salesConfig.salesPhone.replace(/\s+/g, '')}`}
              className="inline-flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 sm:w-auto"
              onClick={() => {
                trackEvent('click_call_agent', { source: 'floating_widget' });
                void trackFunnelEvent('agent_call_clicked', { source: 'floating_widget' });
              }}
            >
              <PhoneIcon className="h-3.5 w-3.5" />
              Call now
            </a>
          </div>

          {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {success && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p>}

          <form onSubmit={handleSubmit} className="space-y-3 pb-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>

            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={formData.inquiryType}
                onChange={(event) => setFormData((prev) => ({ ...prev, inquiryType: event.target.value as InquiryType }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {inquiryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Preferred callback time (optional)"
                value={formData.preferredCallbackTime}
                onChange={(event) => setFormData((prev) => ({ ...prev, preferredCallbackTime: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <input
              type="text"
              placeholder="Timezone (optional)"
              value={formData.timezone}
              onChange={(event) => setFormData((prev) => ({ ...prev, timezone: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <textarea
              rows={4}
              placeholder="Tell us what you need help with (optional)"
              value={formData.message}
              onChange={(event) => setFormData((prev) => ({ ...prev, message: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              maxLength={2000}
            />

            <div className="-mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">Optional</span>
              <span className="text-slate-400">{messageLength}/2000</span>
            </div>

            <input
              type="text"
              value={formData.website}
              onChange={(event) => setFormData((prev) => ({ ...prev, website: event.target.value }))}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={formData.consentAccepted}
                onChange={(event) => setFormData((prev) => ({ ...prev, consentAccepted: event.target.checked }))}
                className="mt-0.5 h-4 w-4"
              />
              I agree to receive call or WhatsApp follow-up from LoanPro sales team.
            </label>

            <button
              type="submit"
              disabled={submitting || !isValid}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? 'Submitting...' : 'Request Callback'}
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
