'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useDialog } from '@/components/DialogProvider';

type LeadStatus = 'new' | 'called' | 'follow-up' | 'converted' | 'closed';

interface ContactLead {
  _id: string;
  requestId: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  inquiryType: string;
  message: string;
  preferredCallbackTime?: string;
  timezone?: string;
  status: LeadStatus;
  priority: 'normal' | 'high';
  assignedTo?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
  callNotes?: Array<{ note: string; by: string; createdAt: string }>;
}

interface LeadStats {
  new: number;
  called: number;
  'follow-up': number;
  converted: number;
  closed: number;
}

interface FunnelInsights {
  windowDays: number;
  events: {
    pageViews: number;
    widgetOpened: number;
    supportFormOpened: number;
    leadsSubmitted: number;
    checkoutStarted: number;
  };
  leadSources: Array<{ source: string; count: number }>;
  topLeadPages: Array<{ pagePath: string; count: number }>;
  widgetLeads: number;
  conversionRate: number;
}

const initialStats: LeadStats = {
  new: 0,
  called: 0,
  'follow-up': 0,
  converted: 0,
  closed: 0
};

const initialFunnelInsights: FunnelInsights = {
  windowDays: 30,
  events: {
    pageViews: 0,
    widgetOpened: 0,
    supportFormOpened: 0,
    leadsSubmitted: 0,
    checkoutStarted: 0,
  },
  leadSources: [],
  topLeadPages: [],
  widgetLeads: 0,
  conversionRate: 0,
};

const statusOptions: LeadStatus[] = ['new', 'called', 'follow-up', 'converted', 'closed'];

const statusLabel: Record<LeadStatus, string> = {
  new: 'New',
  called: 'Called',
  'follow-up': 'Follow-up',
  converted: 'Converted',
  closed: 'Closed'
};

const statusOptionLabel: Record<LeadStatus, string> = {
  new: '🔵 New',
  called: '🟣 Called',
  'follow-up': '🟠 Follow-up',
  converted: '🟢 Converted',
  closed: '⚪ Closed'
};

const inquiryLabel: Record<string, string> = {
  sales: 'Sales',
  'demo-request': 'Demo Request',
  pricing: 'Pricing',
  'application-setup': 'Application Setup',
  partnership: 'Partnership',
  other: 'Other'
};

export default function ContactLeadsTab() {
  const dialog = useDialog();
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [stats, setStats] = useState<LeadStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<ContactLead | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'today-followups' | 'high-priority'>('all');
  const [funnelInsights, setFunnelInsights] = useState<FunnelInsights>(initialFunnelInsights);

  useEffect(() => {
    void fetchLeads();
  }, [statusFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/admin/contact-requests', window.location.origin);
      if (statusFilter !== 'all') {
        url.searchParams.append('status', statusFilter);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        await dialog.alert('Failed to fetch contact leads.', {
          title: 'Fetch Failed',
          type: 'error'
        });
        return;
      }

      const data = await response.json();
      setLeads(data.leads || []);
      setStats(data.stats || initialStats);
      setFunnelInsights(data.funnelInsights || initialFunnelInsights);
    } catch (error) {
      console.error('Error fetching contact leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadDetail = async (requestId: string) => {
    try {
      const response = await fetch(`/api/admin/contact-requests/${requestId}`);

      if (!response.ok) {
        await dialog.alert('Failed to fetch lead details.', {
          title: 'Error',
          type: 'error'
        });
        return;
      }

      const data = await response.json();
      setSelectedLead(data.lead || null);
    } catch (error) {
      console.error('Error fetching lead detail:', error);
    }
  };

  const updateLead = async (payload: Record<string, unknown>) => {
    if (!selectedLead) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/contact-requests/${selectedLead.requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        await dialog.alert(data.error || 'Failed to update lead.', {
          title: 'Update Failed',
          type: 'error'
        });
        return;
      }

      const data = await response.json();
      setSelectedLead(data.lead || null);
      await fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    let baseLeads = leads;

    if (viewFilter === 'today-followups') {
      const now = new Date();
      baseLeads = leads.filter((lead) => {
        if (!lead.nextFollowUpAt) {
          return false;
        }
        const followUpDate = new Date(lead.nextFollowUpAt);
        return (
          followUpDate.getFullYear() === now.getFullYear() &&
          followUpDate.getMonth() === now.getMonth() &&
          followUpDate.getDate() === now.getDate()
        );
      });
    }

    if (viewFilter === 'high-priority') {
      baseLeads = baseLeads.filter((lead) => lead.priority === 'high');
    }

    if (!normalized) {
      return baseLeads;
    }

    return baseLeads.filter((lead) => {
      return (
        lead.requestId.toLowerCase().includes(normalized) ||
        lead.name.toLowerCase().includes(normalized) ||
        lead.email.toLowerCase().includes(normalized) ||
        lead.phone.toLowerCase().includes(normalized) ||
        lead.organization.toLowerCase().includes(normalized)
      );
    });
  }, [leads, searchTerm, viewFilter]);

  const todayFollowUpCount = useMemo(() => {
    const now = new Date();
    return leads.filter((lead) => {
      if (!lead.nextFollowUpAt) {
        return false;
      }
      const followUpDate = new Date(lead.nextFollowUpAt);
      return (
        followUpDate.getFullYear() === now.getFullYear() &&
        followUpDate.getMonth() === now.getMonth() &&
        followUpDate.getDate() === now.getDate()
      );
    }).length;
  }, [leads]);

  const highPriorityCount = useMemo(() => leads.filter((lead) => lead.priority === 'high').length, [leads]);

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-700';
      case 'called':
        return 'bg-indigo-100 text-indigo-700';
      case 'follow-up':
        return 'bg-amber-100 text-amber-700';
      case 'converted':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) {
      return 'Not specified';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Not specified';
    }

    return parsed.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Funnel Page Views ({funnelInsights.windowDays}d)</p>
          <p className="text-2xl font-semibold text-slate-900">{funnelInsights.events.pageViews}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Widget Opens</p>
          <p className="text-2xl font-semibold text-slate-900">{funnelInsights.events.widgetOpened}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Leads Submitted</p>
          <p className="text-2xl font-semibold text-slate-900">{funnelInsights.events.leadsSubmitted}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Lead to Converted (%)</p>
          <p className="text-2xl font-semibold text-slate-900">{funnelInsights.conversionRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Top Lead Sources</h3>
            <span className="text-xs text-slate-500">Widget leads: {funnelInsights.widgetLeads}</span>
          </div>
          {funnelInsights.leadSources.length === 0 ? (
            <p className="text-sm text-slate-500">No source metadata available yet.</p>
          ) : (
            <div className="space-y-2">
              {funnelInsights.leadSources.map((item) => (
                <div key={`${item.source}-${item.count}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-700">{item.source}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Pages Driving Leads</h3>
          {funnelInsights.topLeadPages.length === 0 ? (
            <p className="text-sm text-slate-500">No page path data captured yet.</p>
          ) : (
            <div className="space-y-2">
              {funnelInsights.topLeadPages.map((item) => (
                <div key={`${item.pagePath}-${item.count}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-700 truncate pr-2">{item.pagePath}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 text-sm">New</p>
          <p className="text-2xl font-semibold text-slate-900">{stats.new}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Called</p>
          <p className="text-2xl font-semibold text-slate-900">{stats.called}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Follow-up</p>
          <p className="text-2xl font-semibold text-slate-900">{stats['follow-up']}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Converted</p>
          <p className="text-2xl font-semibold text-slate-900">{stats.converted}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Closed</p>
          <p className="text-2xl font-semibold text-slate-900">{stats.closed}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-2xl">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, email, phone, request ID..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setViewFilter('all')}
            className={`rounded-lg border px-3 py-2.5 text-sm ${
              viewFilter === 'all'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Leads
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('today-followups')}
            className={`rounded-lg border px-3 py-2.5 text-sm ${
              viewFilter === 'today-followups'
                ? 'border-amber-600 bg-amber-50 text-amber-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Today Follow-ups ({todayFollowUpCount})
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('high-priority')}
            className={`rounded-lg border px-3 py-2.5 text-sm ${
              viewFilter === 'high-priority'
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            High Priority ({highPriorityCount})
          </button>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | LeadStatus)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusOptionLabel[status]}
              </option>
            ))}
          </select>
          <button
            onClick={() => void fetchLeads()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-700 hover:bg-slate-50"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-lg font-semibold text-slate-900">Contact Leads</h3>
          </div>
          <div className="max-h-[640px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-500">Loading leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No leads found.</div>
            ) : (
              filteredLeads.map((lead) => (
                <button
                  type="button"
                  key={lead._id}
                  onClick={() => void fetchLeadDetail(lead.requestId)}
                  className={`w-full px-4 py-4 border-b border-slate-100 text-left hover:bg-slate-50 ${
                    selectedLead?.requestId === lead.requestId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.requestId}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(lead.status)}`}>
                        {statusLabel[lead.status]}
                      </span>
                      {lead.priority === 'high' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                          high
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{lead.organization}</p>
                  <p className="text-sm text-slate-500">{lead.phone} • {inquiryLabel[lead.inquiryType] || lead.inquiryType}</p>
                  {lead.nextFollowUpAt && (
                    <p className="text-xs text-amber-700 mt-1">Follow-up: {formatDateTime(lead.nextFollowUpAt)}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{formatDateTime(lead.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          {!selectedLead ? (
            <div className="h-full flex items-center justify-center text-center text-slate-500">
              <div>
                <PhoneIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>Select a lead to view details and update call status.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedLead.name}</h3>
                  <p className="text-sm text-slate-500">{selectedLead.requestId}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(selectedLead.status)}`}>
                  {statusLabel[selectedLead.status]}
                </span>
              </div>

              <div className="text-sm text-slate-700 space-y-1">
                <p><strong>Email:</strong> {selectedLead.email}</p>
                <p><strong>Phone:</strong> {selectedLead.phone}</p>
                <p><strong>Organization:</strong> {selectedLead.organization}</p>
                <p><strong>Inquiry:</strong> {inquiryLabel[selectedLead.inquiryType] || selectedLead.inquiryType}</p>
                <p><strong>Preferred Time:</strong> {selectedLead.preferredCallbackTime || 'Not specified'}</p>
                <p><strong>Timezone:</strong> {selectedLead.timezone || 'Not specified'}</p>
                <p><strong>Created:</strong> {formatDateTime(selectedLead.createdAt)}</p>
                {selectedLead.nextFollowUpAt && (
                  <p><strong>Next Follow-up:</strong> {formatDateTime(selectedLead.nextFollowUpAt)}</p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 hover:bg-green-100"
                >
                  <PhoneIcon className="w-4 h-4" />
                  Call Now
                </a>
                <a
                  href={`mailto:${selectedLead.email}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Email
                </a>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                {selectedLead.message}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedLead.status}
                  onChange={(event) => {
                    void updateLead({ status: event.target.value });
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusOptionLabel[status]}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedLead.priority}
                  onChange={(event) => {
                    void updateLead({ priority: event.target.value });
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                >
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={selectedLead.assignedTo || ''}
                  onChange={(event) => {
                    setSelectedLead({ ...selectedLead, assignedTo: event.target.value });
                  }}
                  onBlur={() => {
                    void updateLead({ assignedTo: selectedLead.assignedTo || '' });
                  }}
                  placeholder="Assign to (name/email)"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />

                <input
                  type="datetime-local"
                  value={selectedLead.nextFollowUpAt ? new Date(selectedLead.nextFollowUpAt).toISOString().slice(0, 16) : ''}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSelectedLead({
                      ...selectedLead,
                      nextFollowUpAt: nextValue ? new Date(nextValue).toISOString() : undefined
                    });
                    if (nextValue) {
                      void updateLead({ nextFollowUpAt: new Date(nextValue).toISOString() });
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add call note (summary, decision, next action)..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!note.trim()) {
                      return;
                    }
                    await updateLead({ callNote: note, noteBy: 'Support Team' });
                    setNote('');
                  }}
                  disabled={saving || !note.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ClockIcon className="w-4 h-4" />}
                  Save Note
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Call Notes</p>
                {!selectedLead.callNotes || selectedLead.callNotes.length === 0 ? (
                  <p className="text-sm text-slate-500">No notes yet.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {[...selectedLead.callNotes].reverse().map((entry, index) => (
                      <div key={`${entry.createdAt}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.note}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {entry.by} • {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void updateLead({ status: 'called' })}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <PhoneIcon className="w-4 h-4" />
                  Mark Called
                </button>
                <button
                  type="button"
                  onClick={() => void updateLead({ status: 'follow-up' })}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <ClockIcon className="w-4 h-4" />
                  Follow-up
                </button>
                <button
                  type="button"
                  onClick={() => void updateLead({ status: 'converted' })}
                  className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 hover:bg-green-100"
                >
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                  Converted
                </button>
                <button
                  type="button"
                  onClick={() => void updateLead({ status: 'closed' })}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <XCircleIcon className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}