'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  IndianRupee,
} from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { toUserFriendlyToastError } from '@/lib/toastErrorMessage';

interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  userName: string;
  userEmail: string;
  plan: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  razorpayOrderId: string;
  razorpayPaymentId: string;
  paymentMethod?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

interface PaginationData {
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

export default function PaymentsPage() {
  const { user } = useUser();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    limit: 50,
    skip: 0,
    hasMore: false,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter !== 'all' ? statusFilter : 'all',
        limit: '50',
        skip: '0',
      });

      const response = await fetch(`/api/admin/payments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch payments');

      const data = await response.json();
      setPayments(data.payments);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(toUserFriendlyToastError(err));
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredPayments = payments.filter(
    (p) =>
      p.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.razorpayPaymentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Payment History</h1>
          <p className="text-gray-400">View and manage all payment transactions</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-1">Total Payments</p>
            <p className="text-2xl font-bold text-white">{pagination.total}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-green-400">
              ₹{payments
                .filter((p) => p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0)
                .toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-400">
              {payments.filter((p) => p.status === 'completed').length}
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-400">
              {payments.filter((p) => p.status === 'failed').length}
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, email, or payment ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              className="bg-transparent text-white focus:outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        {loading ? (
          <LoadingSkeleton type="table" />
        ) : error ? (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-200">
            Error: {error}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-2">No payments found</p>
            <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Payment ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-700 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{payment.userName}</p>
                          <p className="text-sm text-gray-400">{payment.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm font-medium">
                          {payment.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4 text-green-400" />
                          <span className="font-semibold text-white">
                            {payment.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-mono text-gray-400">
                          {payment.razorpayPaymentId?.slice(0, 12) || 'N/A'}...
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <span className={`capitalize ${getStatusColor(payment.status)} font-medium`}>
                            {payment.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(payment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Info */}
            <div className="px-6 py-4 border-t border-slate-700 text-sm text-gray-400">
              Showing {filteredPayments.length} of {pagination.total} payments
              {pagination.hasMore && (
                <p className="text-xs text-gray-500 mt-2">
                  Load more functionality coming soon
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
