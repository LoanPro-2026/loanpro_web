'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import {
  ChartBarIcon,
  UsersIcon,
  CreditCardIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  ArrowPathIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface DashboardMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  trialUsers: number;
  expiredSubscriptions: number;
  activeUsersThisMonth: number;
  avgSubscriptionValue: number;
}

interface User {
  _id: string;
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  subscription?: {
    plan: string;
    status: string;
    endDate: string;
    billingPeriod?: string;
  };
}

interface Subscription {
  _id: string;
  userId: string;
  userEmail: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  billingPeriod: string;
  amount?: number;
}

interface RecentPayment {
  _id: string;
  userId: string;
  userEmail?: string;
  amount: number;
  status: string;
  plan: string;
  createdAt: string;
  razorpayPaymentId?: string;
}

type TabType = 'dashboard' | 'users' | 'subscriptions' | 'pricing' | 'analytics';

const AdminDashboard = () => {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [prices, setPrices] = useState({ Basic: 699, Pro: 833, Enterprise: 979 });
  const [editingPrices, setEditingPrices] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [fixingPayments, setFixingPayments] = useState(false);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) {
      redirect('/sign-in');
    }

    const checkAdminAccess = async () => {
      try {
        const response = await fetch('/api/admin/verify');
        if (!response.ok) {
          redirect('/');
        } else {
          // Admin email verified, end loading state to show password prompt
          setLoading(false);
        }
      } catch (err) {
        console.error('Admin verification failed:', err);
        redirect('/');
      }
    };

    if (isLoaded && user) {
      checkAdminAccess();
    }

    // Load data only if authenticated
    if (isLoaded && user && isAuthenticated) {
      fetchData();
    }
  }, [isLoaded, user, isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchUsers(),
        fetchSubscriptions(),
        fetchRecentPayments()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics');
      if (response.ok) {
        const data = await response.json();
        console.log('Metrics data received:', data);
        setMetrics(data);
      } else {
        console.error('Failed to fetch metrics, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
        } else {
          console.error('Invalid users data structure:', data);
          setUsers([]);
        }
      } else {
        console.error('Failed to fetch users, status:', response.status);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true);
      const response = await fetch('/api/admin/subscriptions');
      if (response.ok) {
        const data = await response.json();
        console.log('Subscriptions data received:', data);
        if (data.success && Array.isArray(data.subscriptions)) {
          setSubscriptions(data.subscriptions);
        } else {
          console.error('Invalid subscriptions data structure:', data);
          setSubscriptions([]);
        }
      } else {
        console.error('Failed to fetch subscriptions, status:', response.status);
        setSubscriptions([]);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const fetchRecentPayments = async () => {
    try {
      const response = await fetch('/api/admin/recent-payments');
      if (response.ok) {
        const data = await response.json();
        console.log('Recent payments data received:', data);
        if (data.success && Array.isArray(data.payments)) {
          setRecentPayments(data.payments);
        } else {
          console.error('Invalid payments data structure:', data);
          setRecentPayments([]);
        }
      } else {
        console.error('Failed to fetch recent payments, status:', response.status);
        setRecentPayments([]);
      }
    } catch (error) {
      console.error('Error fetching recent payments:', error);
      setRecentPayments([]);
    }
  };

  const handleExtendSubscription = async (subscriptionId: string, days: number) => {
    if (!confirm(`Extend subscription by ${days} days?`)) return;
    
    try {
      const response = await fetch('/api/admin/extend-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, days })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        alert(`Subscription extended by ${days} days successfully`);
        await fetchSubscriptions();
      } else {
        alert(data.error || 'Failed to extend subscription');
      }
    } catch (error) {
      console.error('Error extending subscription:', error);
      alert('Error extending subscription');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('User deleted successfully');
        await fetchUsers();
        await fetchSubscriptions();
        await fetchMetrics();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const handleSavePrices = async () => {
    try {
      const response = await fetch('/api/admin/update-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prices)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('Pricing updated successfully');
        setEditingPrices(false);
      } else {
        alert(data.error || 'Failed to update pricing');
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      alert('Error updating pricing');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setVerifyingPassword(true);

    try {
      const response = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setPasswordError(data.error || 'Invalid password');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      setPasswordError('Failed to verify password');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleFixPaymentAmounts = async () => {
    if (!confirm('This will update all payments that have amount = 0 with the correct amounts from their orders. Continue?')) return;
    
    try {
      setFixingPayments(true);
      const response = await fetch('/api/admin/fix-payment-amounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        alert(`Success! ${data.message}`);
        await fetchMetrics();
      } else {
        alert(data.error || 'Failed to fix payment amounts');
      }
    } catch (error) {
      console.error('Error fixing payment amounts:', error);
      alert('Error fixing payment amounts');
    } finally {
      setFixingPayments(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || u.subscription?.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredSubscriptions = subscriptions.filter(s => {
    const matchesSearch = s.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton type="dashboard" count={3} />
        </div>
      </div>
    );
  }

  // Password authentication screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Admin Access</h2>
              <p className="text-gray-400">Enter the admin password to continue</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="Enter admin password"
                  required
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <XCircleIcon className="w-4 h-4" />
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={verifyingPassword || !password}
                className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {verifyingPassword ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Access Dashboard
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Authorized personnel only</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard' as TabType, name: 'Dashboard', icon: ChartBarIcon },
    { id: 'users' as TabType, name: 'Users', icon: UsersIcon },
    { id: 'subscriptions' as TabType, name: 'Subscriptions', icon: CreditCardIcon },
    { id: 'pricing' as TabType, name: 'Pricing', icon: CurrencyDollarIcon },
    { id: 'analytics' as TabType, name: 'Analytics', icon: ChartPieIcon }
  ];

  const StatCard = ({ label, value, icon: Icon, trend, color = 'blue' }: any) => {
    const colorClasses = {
      blue: 'bg-blue-600',
      green: 'bg-green-600',
      purple: 'bg-indigo-600',
      orange: 'bg-orange-600'
    };
    
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:border-white/40 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
          <div className={`w-12 h-12 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-gradient-to-r from-slate-700/10 to-slate-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-gradient-to-r from-slate-600/10 to-slate-700/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-gray-400">Manage your LoanPro platform</p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg border border-white/20 transition-all"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-slate-700 text-white shadow-lg border border-slate-600'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Total Users" value={metrics?.totalUsers || 0} icon={UsersIcon} trend={12} color="blue" />
              <StatCard label="Active Subscriptions" value={metrics?.activeSubscriptions || 0} icon={CheckCircleIcon} trend={8} color="green" />
              <StatCard label="Total Revenue" value={`₹${(metrics?.totalRevenue || 0).toLocaleString()}`} icon={ArrowTrendingUpIcon} trend={15} color="purple" />
              <StatCard label="Trial Users" value={metrics?.trialUsers || 0} icon={ClockIcon} color="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                    <span className="text-gray-300">Monthly Revenue</span>
                    <span className="text-xl font-bold text-white">₹{(metrics?.monthlyRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                    <span className="text-gray-300">Avg Subscription Value</span>
                    <span className="text-xl font-bold text-white">₹{(metrics?.avgSubscriptionValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                    <span className="text-gray-300">Expired Subscriptions</span>
                    <span className="text-xl font-bold text-red-400">{metrics?.expiredSubscriptions || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <CreditCardIcon className="w-6 h-6" />
                  Recent Payments
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentPayments.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      No recent payments
                    </div>
                  ) : (
                    recentPayments.map((payment) => (
                      <div key={payment._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{payment.userEmail || 'Unknown'}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              payment.status === 'completed' || payment.status === 'captured' || payment.status === 'success' 
                                ? 'bg-green-500/20 text-green-300' 
                                : payment.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="font-medium text-blue-300">{payment.plan} Plan</span>
                            <span>•</span>
                            <span>{new Date(payment.createdAt).toLocaleDateString('en-IN', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            ₹{payment.amount.toLocaleString()}
                          </div>
                          {payment.razorpayPaymentId && (
                            <div className="text-xs text-gray-500">
                              {payment.razorpayPaymentId.slice(-8)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by email or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/40"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Plan</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Joined</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-400">
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            <span>Loading users...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{user.username || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-300">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.subscription?.plan === 'Pro' ? 'bg-purple-500/20 text-purple-300' :
                            user.subscription?.plan === 'Enterprise' ? 'bg-pink-500/20 text-pink-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {user.subscription?.plan || 'None'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.subscription?.status === 'active' ? 'bg-green-500/20 text-green-300' :
                            user.subscription?.status === 'trial' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {user.subscription?.status || 'None'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.userId)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/40"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Plan</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Billing</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">End Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {subscriptionsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-400">
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            <span>Loading subscriptions...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          No subscriptions found
                        </td>
                      </tr>
                    ) : (
                      filteredSubscriptions.map((sub) => (
                      <tr key={sub._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-white">{sub.userEmail}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300">
                            {sub.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 capitalize">{sub.billingPeriod || 'monthly'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            sub.status === 'active' ? 'bg-green-500/20 text-green-300' :
                            sub.status === 'trial' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm">
                          {new Date(sub.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleExtendSubscription(sub._id, 30)}
                              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-sm transition-colors"
                            >
                              +30d
                            </button>
                            <button
                              onClick={() => handleExtendSubscription(sub._id, 90)}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm transition-colors"
                            >
                              +90d
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Plan Pricing (Monthly)</h3>
                {!editingPrices ? (
                  <button
                    onClick={() => setEditingPrices(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit Prices
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePrices}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingPrices(false);
                        setPrices({ Basic: 699, Pro: 833, Enterprise: 979 });
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(prices).map(([plan, price]) => (
                  <div key={plan} className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h4 className="text-lg font-bold text-white mb-4">{plan}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">₹</span>
                      {editingPrices ? (
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrices({...prices, [plan]: parseInt(e.target.value) || 0})}
                          className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                        />
                      ) : (
                        <span className="text-3xl font-bold text-white">{price}</span>
                      )}
                      <span className="text-gray-400">/month</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-sm text-gray-400">Annual (15% off)</p>
                      <p className="text-xl font-bold text-white">₹{Math.round(price * 12 * 0.85).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-300 text-sm">
                  ⚠️ Note: Changing prices will affect new subscriptions only. Existing subscriptions will maintain their current pricing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Revenue by Plan</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Basic</span>
                      <span className="text-white font-semibold">₹45,000</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600" style={{width: '30%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Pro</span>
                      <span className="text-white font-semibold">₹1,25,000</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600" style={{width: '65%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Enterprise</span>
                      <span className="text-white font-semibold">₹25,000</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-pink-600" style={{width: '15%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Subscription Distribution</h3>
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg className="transform -rotate-90" width="192" height="192">
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#1f2937" strokeWidth="32"/>
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#3b82f6" strokeWidth="32" strokeDasharray="150 400" strokeLinecap="round"/>
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#8b5cf6" strokeWidth="32" strokeDasharray="200 400" strokeDashoffset="-150" strokeLinecap="round"/>
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#ec4899" strokeWidth="32" strokeDasharray="100 400" strokeDashoffset="-350" strokeLinecap="round"/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">{metrics?.activeSubscriptions || 0}</p>
                        <p className="text-xs text-gray-400">Active</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-white">30%</p>
                    <p className="text-xs text-gray-400">Basic</p>
                  </div>
                  <div className="text-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-white">60%</p>
                    <p className="text-xs text-gray-400">Pro</p>
                  </div>
                  <div className="text-center">
                    <div className="w-3 h-3 bg-pink-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-white">10%</p>
                    <p className="text-xs text-gray-400">Enterprise</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Monthly Revenue Trend</h3>
              <div className="h-64 flex items-end justify-around gap-2">
                {[45, 52, 48, 65, 78, 85, 92, 88, 105, 115, 120, 130].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{height}K
                    </div>
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 via-purple-600 to-pink-600 rounded-t-lg transition-all hover:opacity-80 cursor-pointer group"
                      style={{ height: `${(height / 130) * 100}%` }}
                    ></div>
                    <span className="text-xs text-gray-400">
                      {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  defaultValue={selectedUser.username}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  defaultValue={selectedUser.email}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                  disabled
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    alert('User updated (API not implemented)');
                    setShowEditModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
