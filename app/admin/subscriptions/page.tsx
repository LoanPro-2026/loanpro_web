'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCardIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  billingPeriod: 'monthly' | 'annually';
  amount: number;
}

const AdminSubscriptionsPage = () => {
  const { user, isLoaded } = useUser();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'trial' | 'expired' | 'cancelled'>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | 'basic' | 'pro' | 'enterprise'>('all');

  useEffect(() => {
    if (isLoaded && !user) redirect('/sign-in');
    if (isLoaded && user) fetchSubscriptions();
  }, [isLoaded, user]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/subscriptions');
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      const data = await response.json();
      setSubscriptions(data);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    try {
      const response = await fetch(`/api/admin/subscriptions/${subId}/cancel`, { method: 'POST' });
      if (response.ok) {
        setSubscriptions(subscriptions.map(s => s.id === subId ? { ...s, status: 'cancelled' as const } : s));
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
    }
  };

  const handleExtendSubscription = async (subId: string) => {
    const months = prompt('Extend for how many months?', '1');
    if (!months || isNaN(parseInt(months))) return;

    try {
      const response = await fetch(`/api/admin/subscriptions/${subId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: parseInt(months) })
      });
      if (response.ok) {
        fetchSubscriptions();
      }
    } catch (err) {
      console.error('Error extending subscription:', err);
    }
  };

  const filteredSubscriptions = subscriptions.filter(s => {
    const matchesSearch = s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchesPlan = filterPlan === 'all' || s.plan === filterPlan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20 px-4">
        <LoadingSkeleton type="table" count={5} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <CreditCardIcon className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Subscriptions Management</h1>
          </div>
          <p className="text-gray-400">Manage all active and inactive subscriptions</p>
        </div>

        {/* Filters & Search */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value as any)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <div className="text-gray-400 font-medium py-2">
              {filteredSubscriptions.length} subscriptions
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Period</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Expires</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{s.userName}</p>
                        <p className="text-gray-400 text-sm">{s.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-medium capitalize">{s.plan}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        s.status === 'active' ? 'bg-green-500/20 text-green-300' :
                        s.status === 'trial' ? 'bg-blue-500/20 text-blue-300' :
                        s.status === 'expired' ? 'bg-red-500/20 text-red-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 capitalize text-sm">{s.billingPeriod}</td>
                    <td className="px-6 py-4 text-white font-medium">₹{s.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{new Date(s.endDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {s.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => handleExtendSubscription(s.id)}
                              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                              title="Extend subscription"
                            >
                              Extend
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                              onClick={() => handleCancelSubscription(s.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                              title="Cancel subscription"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No subscriptions found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSubscriptionsPage;
