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
  CalendarIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import AdminTicketsTab from '@/components/AdminTicketsTab';
import ContactLeadsTab from '@/components/ContactLeadsTab';
import { useDialog } from '@/components/DialogProvider';
import { toUserFriendlyToastError } from '@/lib/toastErrorMessage';

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

interface PaymentIncident {
  _id: string;
  incidentKey: string;
  status: 'open' | 'resolved' | 'ignored';
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  orderId: string;
  paymentId?: string;
  userId?: string;
  plan?: string;
  billingPeriod?: string;
  paymentContext?: string;
  ageMinutes?: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  resolvedAt?: string;
  occurrenceCount?: number;
}

interface PaymentIncidentSummary {
  openCount: number;
  criticalCount: number;
  highCount: number;
  stalePendingCount: number;
  capturedNotFinalizedCount: number;
}

interface PaymentIncidentConfig {
  alertsEnabled: boolean;
  hasAdminEmails: boolean;
  alertCooldownMinutes: number;
}

type TabType = 'dashboard' | 'users' | 'subscriptions' | 'pricing' | 'analytics' | 'tickets' | 'contact-leads' | 'cancellations' | 'incidents';

const AdminDashboard = () => {
  const { user, isLoaded } = useUser();
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [prices, setPrices] = useState({ Basic: 599, Pro: 899, Enterprise: 1399 });
  const [editingPrices, setEditingPrices] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [fixingPayments, setFixingPayments] = useState(false);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [cancellationsLoading, setCancellationsLoading] = useState(false);
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);
  const [paymentIncidents, setPaymentIncidents] = useState<PaymentIncident[]>([]);
  const [incidentsSummary, setIncidentsSummary] = useState<PaymentIncidentSummary>({
    openCount: 0,
    criticalCount: 0,
    highCount: 0,
    stalePendingCount: 0,
    capturedNotFinalizedCount: 0,
  });
  const [lastIncidentRun, setLastIncidentRun] = useState<any>(null);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [runningReconciliation, setRunningReconciliation] = useState(false);
  const [processingIncidentId, setProcessingIncidentId] = useState<string | null>(null);
  const [incidentsConfig, setIncidentsConfig] = useState<PaymentIncidentConfig>({
    alertsEnabled: true,
    hasAdminEmails: false,
    alertCooldownMinutes: 15,
  });

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
        fetchRecentPayments(),
        fetchCancellations(),
        fetchPaymentIncidents()
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

  const fetchCancellations = async () => {
    try {
      setCancellationsLoading(true);
      const response = await fetch('/api/admin/cancellations');
      if (response.ok) {
        const data = await response.json();
        console.log('Cancellations data received:', data);
        if (data.success && Array.isArray(data.cancellations)) {
          setCancellations(data.cancellations);
        } else {
          console.error('Invalid cancellations data structure:', data);
          setCancellations([]);
        }
      } else {
        console.error('Failed to fetch cancellations, status:', response.status);
        setCancellations([]);
      }
    } catch (error) {
      console.error('Error fetching cancellations:', error);
      setCancellations([]);
    } finally {
      setCancellationsLoading(false);
    }
  };

  const fetchPaymentIncidents = async () => {
    try {
      setIncidentsLoading(true);
      const response = await fetch('/api/admin/payment-incidents?status=all&limit=200');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPaymentIncidents(data.incidents || []);
          setIncidentsSummary(data.summary || {
            openCount: 0,
            criticalCount: 0,
            highCount: 0,
            stalePendingCount: 0,
            capturedNotFinalizedCount: 0,
          });
          setLastIncidentRun(data.lastRun || null);
          setIncidentsConfig(data.config || {
            alertsEnabled: true,
            hasAdminEmails: false,
            alertCooldownMinutes: 15,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching payment incidents:', error);
      setPaymentIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  };

  const handleRunReconciliation = async () => {
    try {
      setRunningReconciliation(true);
      const response = await fetch('/api/admin/payment-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-reconciliation' })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        await dialog.alert(
          `Reconciliation finished. Scanned: ${data.result?.scanned || 0}, Recovered: ${data.result?.autoRecovered || 0}, Opened incidents: ${data.result?.incidentsOpened || 0}`,
          { title: 'Reconciliation Complete', type: 'success' }
        );
        await fetchPaymentIncidents();
      } else {
        await dialog.alert(toUserFriendlyToastError(data?.error || 'Failed to run reconciliation'), { title: 'Action Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error running reconciliation:', error);
      await dialog.alert('Failed to run reconciliation', { title: 'Action Failed', type: 'error' });
    } finally {
      setRunningReconciliation(false);
    }
  };

  const handleRetryIncident = async (orderId: string, incidentId: string) => {
    const shouldContinue = await dialog.confirm('Retry finalization for this incident now?', {
      title: 'Retry Payment Finalization',
      confirmText: 'Retry Now',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!shouldContinue) return;

    try {
      setProcessingIncidentId(incidentId);
      const response = await fetch('/api/admin/payment-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry-incident', orderId })
      });

      const data = await response.json();
      if (response.ok && data.success && data.result?.success) {
        await dialog.alert('Retry completed and payment was recovered.', { title: 'Recovery Success', type: 'success' });
      } else if (response.ok && data.success && data.result?.reason === 'no_captured_payment') {
        await dialog.alert('No captured payment found yet for this order.', { title: 'No Captured Payment', type: 'info' });
      } else {
        await dialog.alert(toUserFriendlyToastError(data?.error || 'Retry failed'), { title: 'Retry Failed', type: 'error' });
      }

      await fetchPaymentIncidents();
    } catch (error) {
      console.error('Error retrying incident:', error);
      await dialog.alert('Retry failed', { title: 'Retry Failed', type: 'error' });
    } finally {
      setProcessingIncidentId(null);
    }
  };

  const handleUpdateIncidentStatus = async (incidentId: string, status: 'open' | 'resolved' | 'ignored') => {
    let note = '';
    if (status === 'resolved' || status === 'ignored') {
      const result = await dialog.prompt(`Add a note for marking this incident as ${status} (optional):`, {
        title: 'Update Incident Status',
        placeholder: 'Optional note',
        confirmText: 'Update',
        cancelText: 'Cancel',
      });
      if (result === null) return;
      note = result;
    }

    try {
      setProcessingIncidentId(incidentId);
      const response = await fetch('/api/admin/payment-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-status', incidentId, status, note })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        await fetchPaymentIncidents();
      } else {
        await dialog.alert(toUserFriendlyToastError(data?.error || 'Failed to update incident status'), { title: 'Update Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating incident status:', error);
      await dialog.alert('Failed to update incident status', { title: 'Update Failed', type: 'error' });
    } finally {
      setProcessingIncidentId(null);
    }
  };

  const handleMarkRefunded = async (cancellationId: string, refundPaymentId?: string) => {
    const shouldContinue = await dialog.confirm('Mark this cancellation as refunded?', {
      title: 'Confirm Refund Status',
      confirmText: 'Mark Refunded',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!shouldContinue) return;
    
    try {
      setProcessingRefund(cancellationId);
      const response = await fetch('/api/admin/cancellations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellationId,
          status: 'refunded',
          refundPaymentId: refundPaymentId || `rfnd_${Date.now()}`,
          adminNotes: `Refund processed by admin on ${new Date().toLocaleDateString()}`
        })
      });

      if (response.ok) {
        await dialog.alert('Cancellation marked as refunded!', { title: 'Success', type: 'success' });
        await fetchCancellations();
      } else {
        const error = await response.json();
        await dialog.alert(`Failed to update: ${error.error || 'Unknown error'}`, { title: 'Update Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error marking refund:', error);
      await dialog.alert('Failed to mark refund. Check console for details.', { title: 'Action Failed', type: 'error' });
    } finally {
      setProcessingRefund(null);
    }
  };

  const handleRejectRefund = async (cancellationId: string) => {
    const reason = await dialog.prompt('Enter reason for rejecting refund (optional):', {
      title: 'Reject Refund Request',
      placeholder: 'Reason (optional)',
      confirmText: 'Reject',
      cancelText: 'Cancel',
    });
    if (reason === null) return; // User cancelled
    
    try {
      setProcessingRefund(cancellationId);
      const response = await fetch('/api/admin/cancellations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellationId,
          status: 'rejected',
          adminNotes: reason || 'Refund request rejected by admin'
        })
      });

      if (response.ok) {
        await dialog.alert('Cancellation marked as rejected!', { title: 'Success', type: 'success' });
        await fetchCancellations();
      } else {
        const error = await response.json();
        await dialog.alert(`Failed to update: ${error.error || 'Unknown error'}`, { title: 'Update Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error rejecting refund:', error);
      await dialog.alert('Failed to reject refund. Check console for details.', { title: 'Action Failed', type: 'error' });
    } finally {
      setProcessingRefund(null);
    }
  };

  const handleExtendSubscription = async (subscriptionId: string, days: number) => {
    const shouldContinue = await dialog.confirm(`Extend subscription by ${days} days?`, {
      title: 'Confirm Subscription Extension',
      confirmText: 'Extend',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!shouldContinue) return;
    
    try {
      const response = await fetch('/api/admin/extend-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, days })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        await dialog.alert(`Subscription extended by ${days} days successfully`, { title: 'Success', type: 'success' });
        await fetchSubscriptions();
      } else {
        await dialog.alert(toUserFriendlyToastError(data?.error || 'Failed to extend subscription'), { title: 'Extension Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error extending subscription:', error);
      await dialog.alert('Error extending subscription', { title: 'Extension Failed', type: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const shouldContinue = await dialog.confirm('Are you sure you want to delete this user? This action cannot be undone.', {
      title: 'Delete User',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'error',
    });
    if (!shouldContinue) return;
    
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        await dialog.alert('User deleted successfully', { title: 'Success', type: 'success' });
        await fetchUsers();
        await fetchSubscriptions();
        await fetchMetrics();
      } else {
        await dialog.alert(toUserFriendlyToastError(data?.error || 'Failed to delete user'), { title: 'Delete Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      await dialog.alert('Error deleting user', { title: 'Delete Failed', type: 'error' });
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
        await dialog.alert('Pricing updated successfully', { title: 'Success', type: 'success' });
        setEditingPrices(false);
      } else {
        await dialog.alert(toUserFriendlyToastError(data?.error || 'Failed to update pricing'), { title: 'Update Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      await dialog.alert('Error updating pricing', { title: 'Update Failed', type: 'error' });
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
        setPasswordError(toUserFriendlyToastError(data?.error || 'Invalid password'));
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      setPasswordError('Failed to verify password');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleFixPaymentAmounts = async () => {
    const shouldContinue = await dialog.confirm(
      'This will update all payments that have amount = 0 with the correct amounts from their orders. Continue?',
      {
        title: 'Fix Payment Amounts',
        confirmText: 'Continue',
        cancelText: 'Cancel',
        type: 'warning',
      }
    );
    if (!shouldContinue) return;
    
    try {
      setFixingPayments(true);
      const response = await fetch('/api/admin/fix-payment-amounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        await dialog.alert(`Success! ${data.message}`, { title: 'Operation Complete', type: 'success' });
        await fetchMetrics();
      } else {
        await dialog.alert(toUserFriendlyToastError(data?.error || 'Failed to fix payment amounts'), { title: 'Operation Failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error fixing payment amounts:', error);
      await dialog.alert('Error fixing payment amounts', { title: 'Operation Failed', type: 'error' });
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
      <div className="min-h-screen bg-slate-50 pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton type="dashboard" count={3} />
        </div>
      </div>
    );
  }

  // Password authentication screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold text-slate-900 font-display mb-2">Admin Access</h2>
              <p className="text-slate-600">Enter the admin password to continue</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300 transition-colors"
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
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

            <div className="mt-6 text-center text-sm text-slate-500">
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
    { id: 'incidents' as TabType, name: 'Payment Incidents', icon: ExclamationTriangleIcon },
    { id: 'cancellations' as TabType, name: 'Cancellations', icon: XCircleIcon },
    { id: 'pricing' as TabType, name: 'Pricing', icon: CurrencyDollarIcon },
    { id: 'analytics' as TabType, name: 'Analytics', icon: ChartPieIcon },
    { id: 'tickets' as TabType, name: 'Support Tickets', icon: EnvelopeIcon },
    { id: 'contact-leads' as TabType, name: 'Contact Leads', icon: PhoneIcon }
  ];

  const StatCard = ({ label, value, icon: Icon, trend, color = 'blue' }: any) => {
    const colorClasses = {
      blue: 'bg-blue-600',
      green: 'bg-green-600',
      purple: 'bg-indigo-600',
      orange: 'bg-orange-600'
    };

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
          </div>
          <div className={`w-11 h-11 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} rounded-xl flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 font-display mb-2">Admin Dashboard</h1>
              <p className="text-slate-600">Manage your LoanPro platform</p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:border-slate-300 transition-colors"
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
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:border-slate-300'
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
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Quick stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-600">Monthly revenue</span>
                    <span className="text-lg font-semibold text-slate-900">₹{(metrics?.monthlyRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-600">Avg subscription value</span>
                    <span className="text-lg font-semibold text-slate-900">₹{(metrics?.avgSubscriptionValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-600">Expired subscriptions</span>
                    <span className="text-lg font-semibold text-red-600">{metrics?.expiredSubscriptions || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <CreditCardIcon className="w-5 h-5 text-blue-600" />
                  Recent payments
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentPayments.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      No recent payments
                    </div>
                  ) : (
                    recentPayments.map((payment) => (
                      <div key={payment._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-900 font-medium">{payment.userEmail || 'Unknown'}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              payment.status === 'completed' || payment.status === 'captured' || payment.status === 'success' 
                                ? 'bg-green-100 text-green-700' 
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="font-medium text-blue-600">{payment.plan} plan</span>
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
                          <div className="text-lg font-semibold text-slate-900">
                            ₹{payment.amount.toLocaleString()}
                          </div>
                          {payment.razorpayPaymentId && (
                            <div className="text-xs text-slate-400">
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
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users by email or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-300"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Plan</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-500">
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            <span>Loading users...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-900 font-medium">{user.username || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.subscription?.plan === 'Pro' ? 'bg-purple-100 text-purple-700' :
                            user.subscription?.plan === 'Enterprise' ? 'bg-pink-100 text-pink-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {user.subscription?.plan || 'None'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.subscription?.status === 'active' ? 'bg-green-100 text-green-700' :
                            user.subscription?.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {user.subscription?.status || 'None'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.userId)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
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
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-300"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Plan</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Billing</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">End Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {subscriptionsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-500">
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            <span>Loading subscriptions...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          No subscriptions found
                        </td>
                      </tr>
                    ) : (
                      filteredSubscriptions.map((sub) => (
                      <tr key={sub._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-900">{sub.userEmail}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                            {sub.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 capitalize">{sub.billingPeriod || 'monthly'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            sub.status === 'active' ? 'bg-green-100 text-green-700' :
                            sub.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {new Date(sub.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleExtendSubscription(sub._id, 30)}
                              className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm transition-colors"
                            >
                              +30d
                            </button>
                            <button
                              onClick={() => handleExtendSubscription(sub._id, 90)}
                              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm transition-colors"
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
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-slate-900 font-display">Plan Pricing (Monthly)</h3>
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
                        setPrices({ Basic: 599, Pro: 899, Enterprise: 1399 });
                      }}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(prices).map(([plan, price]) => (
                  <div key={plan} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">{plan}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">₹</span>
                      {editingPrices ? (
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrices({...prices, [plan]: parseInt(e.target.value) || 0})}
                          className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-300"
                        />
                      ) : (
                        <span className="text-3xl font-semibold text-slate-900">{price}</span>
                      )}
                      <span className="text-slate-500">/month</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-500">Annual (15% off)</p>
                      <p className="text-xl font-semibold text-slate-900">₹{Math.round(price * 12 * 0.85).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-yellow-700 text-sm">
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
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-6">Revenue by Plan</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Basic</span>
                      <span className="text-slate-900 font-semibold">₹45,000</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{width: '30%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Pro</span>
                      <span className="text-slate-900 font-semibold">₹1,25,000</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{width: '65%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Enterprise</span>
                      <span className="text-slate-900 font-semibold">₹25,000</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-600" style={{width: '15%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-6">Subscription Distribution</h3>
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg className="transform -rotate-90" width="192" height="192">
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#e2e8f0" strokeWidth="32"/>
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#3b82f6" strokeWidth="32" strokeDasharray="150 400" strokeLinecap="round"/>
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#8b5cf6" strokeWidth="32" strokeDasharray="200 400" strokeDashoffset="-150" strokeLinecap="round"/>
                      <circle cx="96" cy="96" r="80" fill="none" stroke="#ec4899" strokeWidth="32" strokeDasharray="100 400" strokeDashoffset="-350" strokeLinecap="round"/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-semibold text-slate-900">{metrics?.activeSubscriptions || 0}</p>
                        <p className="text-xs text-slate-500">Active</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-slate-900">30%</p>
                    <p className="text-xs text-slate-500">Basic</p>
                  </div>
                  <div className="text-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-slate-900">60%</p>
                    <p className="text-xs text-slate-500">Pro</p>
                  </div>
                  <div className="text-center">
                    <div className="w-3 h-3 bg-pink-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-slate-900">10%</p>
                    <p className="text-xs text-slate-500">Enterprise</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900 mb-6">Monthly Revenue Trend</h3>
              <div className="h-64 flex items-end justify-around gap-2">
                {[45, 52, 48, 65, 78, 85, 92, 88, 105, 115, 120, 130].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs text-slate-700 font-semibold">
                      ₹{height}K
                    </div>
                    <div 
                      className="w-full bg-blue-600 rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                      style={{ height: `${(height / 130) * 100}%` }}
                    ></div>
                    <span className="text-xs text-slate-500">
                      {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment Incidents Tab */}
        {activeTab === 'incidents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 font-display">Payment Incidents</h3>
                <p className="text-slate-600 mt-1">Monitor stuck orders and recover captured payments proactively</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchPaymentIncidents}
                  className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Refresh
                </button>
                <button
                  onClick={handleRunReconciliation}
                  disabled={runningReconciliation}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {runningReconciliation ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      Run Reconciliation
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm font-medium">Open Incidents</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{incidentsSummary.openCount || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm font-medium">Critical</p>
                <p className="text-2xl font-semibold text-red-600 mt-1">{incidentsSummary.criticalCount || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm font-medium">High</p>
                <p className="text-2xl font-semibold text-orange-600 mt-1">{incidentsSummary.highCount || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm font-medium">Captured Not Finalized</p>
                <p className="text-2xl font-semibold text-purple-700 mt-1">{incidentsSummary.capturedNotFinalizedCount || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm font-medium">Stale Pending</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{incidentsSummary.stalePendingCount || 0}</p>
              </div>
            </div>

            {lastIncidentRun && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                Last reconciliation: {new Date(lastIncidentRun.createdAt || lastIncidentRun.completedAt).toLocaleString()} • Scanned {lastIncidentRun.scanned || 0} • Recovered {lastIncidentRun.autoRecovered || 0} • Failures {lastIncidentRun.failures || 0}
              </div>
            )}

            {(!incidentsConfig.alertsEnabled || !incidentsConfig.hasAdminEmails) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
                Incident email alerts are not fully configured. Set ENABLE_PAYMENT_INCIDENT_ALERTS=true and ADMIN_EMAILS (comma-separated) to receive high/critical payment incident alerts.
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Type</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Severity</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Order</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Context</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Detected</th>
                      <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {incidentsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-500">
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            <span>Loading incidents...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paymentIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          No payment incidents found
                        </td>
                      </tr>
                    ) : (
                      paymentIncidents.map((incident) => (
                        <tr key={incident._id} className="hover:bg-slate-50">
                          <td className="py-4 px-6">
                            <div className="text-sm font-semibold text-slate-900">{incident.type.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-slate-500 mt-1 max-w-sm truncate" title={incident.message}>{incident.message}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              incident.severity === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : incident.severity === 'high'
                                ? 'bg-orange-100 text-orange-700'
                                : incident.severity === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {incident.severity}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600">
                            <div>{incident.orderId}</div>
                            {incident.paymentId && <div className="text-xs text-slate-400">{incident.paymentId}</div>}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600">
                            <div>{incident.plan || 'N/A'} • {incident.billingPeriod || 'monthly'}</div>
                            <div className="text-xs text-slate-400">{incident.paymentContext || 'new'}</div>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600">
                            <div>{new Date(incident.lastDetectedAt).toLocaleString()}</div>
                            {incident.ageMinutes ? <div className="text-xs text-slate-400">Age: {incident.ageMinutes}m</div> : null}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              incident.status === 'resolved'
                                ? 'bg-green-100 text-green-700'
                                : incident.status === 'ignored'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {incident.status}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleRetryIncident(incident.orderId, incident._id)}
                                disabled={processingIncidentId === incident._id}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                Retry
                              </button>
                              {incident.status !== 'resolved' && (
                                <button
                                  onClick={() => handleUpdateIncidentStatus(incident._id, 'resolved')}
                                  disabled={processingIncidentId === incident._id}
                                  className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-semibold transition-colors disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  Resolve
                                </button>
                              )}
                              {incident.status !== 'ignored' && (
                                <button
                                  onClick={() => handleUpdateIncidentStatus(incident._id, 'ignored')}
                                  disabled={processingIncidentId === incident._id}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  Ignore
                                </button>
                              )}
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

        {/* Cancellations Tab */}
        {activeTab === 'cancellations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 font-display">Subscription Cancellations</h3>
                <p className="text-slate-600 mt-1">Manage refund requests and process cancellations</p>
              </div>
              <button
                onClick={fetchCancellations}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:border-slate-300 transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5" />
                Refresh
              </button>
            </div>

            {cancellationsLoading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <ArrowPathIcon className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                <p className="text-slate-600">Loading cancellations...</p>
              </div>
            ) : cancellations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-slate-600 text-lg font-semibold mb-2">No cancellations pending</p>
                <p className="text-slate-500 text-sm">All refund requests have been processed</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">User</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Plan</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Amount Paid</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Refund Amount</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Days Used</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Reason</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Status</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Date</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cancellations.map((cancellation) => (
                        <tr key={cancellation._id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{cancellation.username}</div>
                              <div className="text-xs text-slate-500">{cancellation.userEmail}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                              {cancellation.plan}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold text-slate-900">
                            ₹{cancellation.totalPaid?.toLocaleString() || 0}
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold text-green-600">
                            ₹{cancellation.netRefund?.toLocaleString() || 0}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600">
                            {cancellation.daysUsed || 0} / {(cancellation.daysUsed || 0) + (cancellation.daysRemaining || 0)}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600 max-w-xs truncate" title={cancellation.reason}>
                            {cancellation.reason || 'Not specified'}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              cancellation.status === 'refunded'
                                ? 'bg-green-100 text-green-800'
                                : cancellation.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : cancellation.status === 'processing'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {cancellation.status === 'refunded' 
                                ? '✓ Refunded' 
                                : cancellation.status === 'rejected'
                                ? '✗ Rejected'
                                : cancellation.status === 'processing'
                                ? '⏳ Processing'
                                : '📋 Pending'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600">
                            {new Date(cancellation.requestDate).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6">
                            {cancellation.status === 'pending_review' ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleMarkRefunded(cancellation._id)}
                                  disabled={processingRefund === cancellation._id}
                                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:cursor-not-allowed"
                                  title="Mark as refunded"
                                >
                                  {processingRefund === cancellation._id ? (
                                    <>
                                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircleIcon className="w-4 h-4" />
                                      Refunded
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRejectRefund(cancellation._id)}
                                  disabled={processingRefund === cancellation._id}
                                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:cursor-not-allowed"
                                  title="Reject refund"
                                >
                                  <XCircleIcon className="w-4 h-4" />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="text-center text-xs text-slate-500">
                                {cancellation.processedDate 
                                  ? `Processed ${new Date(cancellation.processedDate).toLocaleDateString()}`
                                  : 'Processed'}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm font-medium">Total Cancellations</p>
                  <XCircleIcon className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-2xl font-semibold text-slate-900">{cancellations.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm font-medium">Pending Review</p>
                  <ClockIcon className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  {cancellations.filter(c => c.status === 'pending_review').length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm font-medium">Refunded</p>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  {cancellations.filter(c => c.status === 'refunded').length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm font-medium">Total Refunds</p>
                  <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  ₹{cancellations
                    .filter(c => c.status === 'refunded')
                    .reduce((sum, c) => sum + (c.netRefund || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Support Tickets Tab */}
        {activeTab === 'tickets' && (
          <AdminTicketsTab />
        )}

        {/* Contact Leads Tab */}
        {activeTab === 'contact-leads' && (
          <ContactLeadsTab />
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-xl">
            <h3 className="text-2xl font-semibold text-slate-900 font-display mb-6">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  defaultValue={selectedUser.username}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  defaultValue={selectedUser.email}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 focus:outline-none"
                  disabled
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await dialog.alert('User updated (API not implemented)', { title: 'Notice', type: 'info' });
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
