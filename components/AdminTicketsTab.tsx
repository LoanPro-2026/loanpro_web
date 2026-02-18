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
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats>({ open: 0, 'in-progress': 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [adminToken, setAdminToken] = useState('');

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/admin/get-admin-token');
        if (res.ok) {
          const data = await res.json();
          setAdminToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching admin token:', error);
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    if (adminToken) {
      fetchTickets();
    }
  }, [statusFilter, adminToken]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/support/admin/tickets', window.location.origin);
      if (statusFilter !== 'all') {
        url.searchParams.append('status', statusFilter);
      }

      const res = await fetch(url.toString(), {
        headers: {
          'x-admin-token': adminToken
        }
      });

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
      const res = await fetch(`/api/support/admin/tickets/${ticketId}`, {
        headers: {
          'x-admin-token': adminToken
        }
      });

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
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
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
        alert('Failed to send reply');
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
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        await fetchTicketDetail(selectedTicket.ticketId);
        await fetchTickets();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-500/20 text-green-300';
      case 'in-progress':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'resolved':
        return 'bg-blue-500/20 text-blue-300';
      case 'closed':
        return 'bg-gray-500/20 text-gray-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-500/20 text-green-300';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'high':
        return 'bg-orange-500/20 text-orange-300';
      case 'urgent':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
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
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Open</p>
              <p className="text-2xl font-bold text-white">{stats.open}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-white">{stats['in-progress']}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Resolved</p>
              <p className="text-2xl font-bold text-white">{stats.resolved}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Closed</p>
              <p className="text-2xl font-bold text-white">{stats.closed}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button
          onClick={() => fetchTickets()}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl border border-white/20 transition-all"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/20">
              <h3 className="text-lg font-bold text-white">Tickets</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-400">
                  <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto mb-2" />
                  {adminToken ? 'Loading tickets...' : 'Initializing...'}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-4 text-center text-gray-400">No tickets found</div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => fetchTicketDetail(ticket.ticketId)}
                    className={`p-4 border-b border-white/10 cursor-pointer transition-all hover:bg-white/5 ${
                      selectedTicket?.ticketId === ticket.ticketId ? 'bg-white/10 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-white text-sm">{ticket.subject}</div>
                      {ticket.hasUnreadResponses && (
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{ticket.ticketId}</div>
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
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden flex flex-col h-96">
              <div className="p-6 border-b border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{selectedTicket.subject}</h3>
                    <p className="text-sm text-gray-400">{selectedTicket.ticketId}</p>
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
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-gray-400">
                  <p>From: {selectedTicket.userEmail}</p>
                  <p>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-6 border-b border-white/20">
                <p className="text-sm text-gray-300">{selectedTicket.description}</p>
              </div>

              {/* Conversation */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                  selectedTicket.responses.map((response, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        response.from === 'admin'
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className="text-xs text-gray-400 mb-1">
                        <strong>{response.from === 'admin' ? response.adminName || 'Support Team' : 'User'}</strong> •{' '}
                        {new Date(response.timestamp).toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-200">{response.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No responses yet</p>
                )}
              </div>

              {/* Reply Form */}
              <div className="p-6 border-t border-white/20 space-y-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your response..."
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/40 text-sm resize-none"
                  rows={2}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !reply.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
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
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 h-96 flex items-center justify-center">
              <p className="text-gray-400">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTicketsTab;
