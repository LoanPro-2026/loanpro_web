'use client';

import { useEffect, useState } from 'react';
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useDialog } from '@/components/DialogProvider';

type SalesSettings = {
  supportEmail: string;
  salesPhone: string;
  salesHours: string;
  salesCallEnabled: boolean;
  salesWidgetEnabled: boolean;
  salesDefaultMessage: string;
  trialDays: number;
  maintenanceMode: boolean;
  allowNewSignups: boolean;
  alertsEnabled: boolean;
};

const DEFAULT_SETTINGS: SalesSettings = {
  supportEmail: 'support@loanpro.tech',
  salesPhone: '+91 78988 85129',
  salesHours: 'Monday-Saturday, 10:00 AM to 7:00 PM IST',
  salesCallEnabled: true,
  salesWidgetEnabled: true,
  salesDefaultMessage: 'I want to talk to an agent before choosing a plan.',
  trialDays: 30,
  maintenanceMode: false,
  allowNewSignups: true,
  alertsEnabled: true,
};

export default function SalesSettingsTab() {
  const dialog = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SalesSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (response.ok && data?.success) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(data.settings || {}),
        });
      } else {
        await dialog.alert(data?.error || 'Failed to load settings.', { title: 'Load Failed', type: 'error' });
      }
    } catch (error) {
      await dialog.alert('Failed to load settings.', { title: 'Load Failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        await dialog.alert(data?.error || 'Failed to save settings.', { title: 'Save Failed', type: 'error' });
        return;
      }

      setSettings((prev) => ({ ...prev, ...(data.settings || {}) }));
      await dialog.alert('Sales settings saved.', { title: 'Saved', type: 'success' });
    } catch (error) {
      await dialog.alert('Failed to save settings.', { title: 'Save Failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading sales settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Sales contact settings</h3>
            <p className="text-sm text-slate-500">These values drive the website Talk to Agent CTA and callback widgets.</p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Sales Phone</span>
            <input
              value={settings.salesPhone}
              onChange={(event) => setSettings((prev) => ({ ...prev, salesPhone: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Sales Hours</span>
            <input
              value={settings.salesHours}
              onChange={(event) => setSettings((prev) => ({ ...prev, salesHours: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Default Agent Message</span>
            <textarea
              rows={3}
              value={settings.salesDefaultMessage}
              onChange={(event) => setSettings((prev) => ({ ...prev, salesDefaultMessage: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">Enable Call CTA</span>
            <input
              type="checkbox"
              checked={settings.salesCallEnabled}
              onChange={(event) => setSettings((prev) => ({ ...prev, salesCallEnabled: event.target.checked }))}
              className="h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">Enable Widget CTA</span>
            <input
              type="checkbox"
              checked={settings.salesWidgetEnabled}
              onChange={(event) => setSettings((prev) => ({ ...prev, salesWidgetEnabled: event.target.checked }))}
              className="h-4 w-4"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Website preview</h3>
            <p className="text-sm text-slate-500">This is what customers will see on the public funnel.</p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">Talk to Agent</p>
            <p className="mt-1 text-sm text-blue-800">Call: {settings.salesPhone}</p>
            <p className="mt-1 text-sm text-blue-800">Hours: {settings.salesHours}</p>
            <p className="mt-3 text-sm text-blue-800">Message: {settings.salesDefaultMessage}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
            <div className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-green-600" /> Call CTA {settings.salesCallEnabled ? 'enabled' : 'disabled'}</div>
            <div className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-green-600" /> Floating widget {settings.salesWidgetEnabled ? 'enabled' : 'disabled'}</div>
            <div className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-green-600" /> Support email {settings.supportEmail}</div>
          </div>

          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:bg-slate-300"
          >
            {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckCircleIcon className="h-4 w-4" />}
            Save Sales Settings
          </button>
        </div>
      </div>
    </div>
  );
}
