'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useDialog } from '@/components/DialogProvider';

interface TicketResponse {
  from: 'user' | 'admin';
  message: string;
  timestamp: string;
  adminName?: string;
}

interface SupportTicket {
  _id: string;
  ticketId: string;
  userName: string;
  userEmail: string;
  subject: string;
  issueType: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  responseCount: number;
  hasUnreadResponses: boolean;
  responses?: TicketResponse[];
  description: string;
}

interface TicketStats {
  open: number;
  'in-progress': number;
  resolved: number;
  closed: number;
}

interface AdminTicketsTabProps {
  // No props needed - token fetched automatically
}

const AdminTicketsTab: React.FC<AdminTicketsTabProps> = () => {
  const dialog = useDialog();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats>({ open: 0, 'in-progress': 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/support/admin/tickets', window.location.origin);
      if (statusFilter !== 'all') {
        url.searchParams.append('status', statusFilter);
      }

      const res = await fetch(url.toString());

      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setStats(data.stats || { open: 0, 'in-progress': 0, resolved: 0, closed: 0 });
      } else {
        console.error('Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetail = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/admin/tickets/${ticketId}`);

      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setReply('');
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/support/admin/tickets/${selectedTicket.ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: reply,
          adminName: 'Support Team'
        })
      });

      if (res.ok) {
        setReply('');
        await fetchTicketDetail(selectedTicket.ticketId);
        await fetchTickets();
      } else {
        await dialog.alert('Failed to send reply', { title: 'Send Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;

    try {
      const res = await fetch(`/api/support/admin/tickets/${selectedTicket.ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        await fetchTicketDetail(selectedTicket.ticketId);
        await fetchTickets();
      } else {
        await dialog.alert('Failed to update status', { title: 'Update Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-700';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-blue-100 text-blue-700';
      case 'closed':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'urgent':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Open</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.open}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">In Progress</p>
              <p className="text-2xl font-semibold text-slate-900">{stats['in-progress']}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Resolved</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.resolved}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Closed</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.closed}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-300"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button
          onClick={() => fetchTickets()}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-3 rounded-lg transition-all"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Tickets</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-500">
                  <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading tickets...
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No tickets found</div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => fetchTicketDetail(ticket.ticketId)}
                    className={`p-4 border-b border-slate-200 cursor-pointer transition-all hover:bg-slate-50 ${
                      selectedTicket?.ticketId === ticket.ticketId ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-slate-900 text-sm">{ticket.subject}</div>
                      {ticket.hasUnreadResponses && (
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mb-2">{ticket.ticketId}</div>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[600px]">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{selectedTicket.subject}</h3>
                    <p className="text-sm text-slate-500">{selectedTicket.ticketId}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap mb-4">
                  {['open', 'in-progress', 'resolved', 'closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`px-3 py-1 text-sm rounded font-semibold transition-all ${
                        selectedTicket.status === status
                          ? `${getStatusColor(status)}`
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-500">
                  <p>From: {selectedTicket.userEmail}</p>
                  <p>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-6 border-b border-slate-200">
                <p className="text-sm text-slate-700">{selectedTicket.description}</p>
              </div>

              {/* Conversation */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                  selectedTicket.responses.map((response, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        response.from === 'admin'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <div className="text-xs text-slate-500 mb-1">
                        <strong>{response.from === 'admin' ? response.adminName || 'Support Team' : 'User'}</strong> •{' '}
                        {new Date(response.timestamp).toLocaleString()}
                      </div>
                      <p className="text-sm text-slate-700">{response.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">No responses yet</p>
                )}
              </div>

              {/* Reply Form */}
              <div className="p-6 border-t border-slate-200 space-y-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your response..."
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300 text-sm resize-none"
                  rows={2}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !reply.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  {sendingReply ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EnvelopeIcon className="w-4 h-4" />
                      Send Reply
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 h-96 flex items-center justify-center shadow-sm">
              <p className="text-slate-500">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTicketsTab;
