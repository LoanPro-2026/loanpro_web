'use client';

import React, { useState, useEffect } from 'react';

interface Ticket {
  _id: string;
  ticketId: string;
  userName: string;
  userEmail: string;
  subject: string;
  issueType: string;
  priority: string;
  status: string;
  createdAt: string;
  responseCount: number;
  hasUnreadResponses: boolean;
}

interface Stats {
  open: number;
  'in-progress': number;
  resolved: number;
  closed: number;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats>({ open: 0, 'in-progress': 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminToken, setAdminToken] = useState('');
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Get admin token from localStorage or prompt
    const token = localStorage.getItem('adminToken') || prompt('Enter admin token:');
    if (token) {
      localStorage.setItem('adminToken', token);
      setAdminToken(token);
      fetchTickets(token);
    }
  }, [statusFilter]);

  const fetchTickets = async (token: string) => {
    setLoading(true);
    try {
      const url = new URL('/api/support/admin/tickets', window.location.origin);
      if (statusFilter !== 'all') {
        url.searchParams.append('status', statusFilter);
      }

      const res = await fetch(url.toString(), {
        headers: {
          'x-admin-token': token
        }
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
        setStats(data.stats);
      } else {
        alert('Failed to fetch tickets. Check your admin token.');
      }
    } catch (error) {
      console.error('Error:', error);
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
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSendResponse = async () => {
    if (!response.trim() || !selectedTicket) return;

    setSending(true);
    try {
      const res = await fetch(`/api/support/admin/tickets/${selectedTicket.ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          message: response,
          adminName: 'Support Team'
        })
      });

      if (res.ok) {
        alert('Response sent!');
        setResponse('');
        fetchTicketDetail(selectedTicket.ticketId);
        fetchTickets(adminToken);
      } else {
        alert('Failed to send response');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSending(false);
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
        alert('Status updated!');
        fetchTicketDetail(selectedTicket.ticketId);
        fetchTickets(adminToken);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'in-progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-blue-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'urgent': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🎫 Support Tickets Dashboard</h1>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg shadow border">
          <div className="text-2xl font-bold text-green-600">{stats.open}</div>
          <div className="text-sm text-gray-600">Open</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow border">
          <div className="text-2xl font-bold text-yellow-600">{stats['in-progress']}</div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow border">
          <div className="text-2xl font-bold text-blue-600">{stats.resolved}</div>
          <div className="text-sm text-gray-600">Resolved</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow border">
          <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
          <div className="text-sm text-gray-600">Closed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {['all', 'open', 'in-progress', 'resolved', 'closed'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded ${
              statusFilter === filter ? 'bg-purple-600 text-white' : 'bg-gray-200'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ')}
          </button>
        ))}
        <button
          onClick={() => fetchTickets(adminToken)}
          className="ml-auto px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold mb-3">Tickets</h2>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No tickets found</div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket._id}
                className={`p-4 bg-white rounded-lg shadow border cursor-pointer hover:shadow-lg ${
                  ticket.hasUnreadResponses ? 'border-2 border-purple-500' : ''
                }`}
                onClick={() => fetchTicketDetail(ticket.ticketId)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold">{ticket.subject}</div>
                  {ticket.hasUnreadResponses && (
                    <span className="text-purple-600 font-bold">●</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {ticket.ticketId} • {ticket.userName} ({ticket.userEmail})
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs rounded text-white ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded text-white ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-200 rounded">
                    {ticket.issueType}
                  </span>
                  {ticket.responseCount > 0 && (
                    <span className="px-2 py-1 text-xs bg-blue-100 rounded">
                      💬 {ticket.responseCount}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ticket Detail */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Ticket Detail</h2>
          {selectedTicket ? (
            <div className="p-6 bg-white rounded-lg shadow border">
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2">{selectedTicket.subject}</h3>
                <div className="text-sm text-gray-600 mb-2">
                  {selectedTicket.ticketId} • Created {new Date(selectedTicket.createdAt).toLocaleString()}
                </div>
                <div className="flex gap-2 mb-4">
                  {['open', 'in-progress', 'resolved', 'closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`px-3 py-1 text-sm rounded ${
                        selectedTicket.status === status
                          ? `${getStatusColor(status)} text-white`
                          : 'bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded mb-4">
                <div className="font-semibold mb-1">Description:</div>
                <div className="whitespace-pre-wrap">{selectedTicket.description}</div>
              </div>

              {/* Responses */}
              <div className="mb-4 space-y-3">
                <div className="font-semibold">Conversation:</div>
                {selectedTicket.responses?.map((resp: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded ${
                      resp.from === 'admin' ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-xs text-gray-600 mb-1">
                      <strong>{resp.from === 'admin' ? resp.adminName || 'Support Team' : 'User'}</strong> •{' '}
                      {new Date(resp.timestamp).toLocaleString()}
                    </div>
                    <div>{resp.message}</div>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <div>
                <textarea
                  className="w-full border rounded p-2 mb-2"
                  rows={4}
                  placeholder="Type your response..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  disabled={sending}
                />
                <button
                  onClick={handleSendResponse}
                  disabled={sending || !response.trim()}
                  className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-300"
                >
                  {sending ? 'Sending...' : '📤 Send Response'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white rounded-lg shadow border text-center text-gray-500">
              Select a ticket to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
