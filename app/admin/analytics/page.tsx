'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowTrendingUpIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface AnalyticsData {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  totalUsers: number;
  newUsersThisMonth: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  monthlyGrowth: number;
  userGrowth: number;
  revenueTrend: number;
  churnRate: number;
  avgCustomerLifetimeValue: number;
  avgMonthlyRecurringRevenue: number;
  topPlan: string;
  planDistribution: { plan: string; count: number }[];
  revenueByPlan: { plan: string; revenue: number }[];
  monthlyRevenueData: { month: string; revenue: number }[];
}

const AdminAnalyticsPage = () => {
  const { user, isLoaded } = useUser();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !user) redirect('/sign-in');
    if (isLoaded && user) fetchAnalytics();
  }, [isLoaded, user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20 px-4">
        <LoadingSkeleton type="dashboard" count={3} />
      </div>
    );
  }

  const StatCard = ({ label, value, icon: Icon, trend, subtext }: any) => (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:border-white/40 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
        </div>
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {trend && (
        <div className={`mt-3 text-sm font-semibold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );

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
            <ArrowTrendingUpIcon className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Analytics & Insights</h1>
          </div>
          <p className="text-gray-400">Deep dive into your business metrics</p>
        </div>

        {/* Revenue Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">Revenue Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Total Revenue"
              value={`₹${(analytics?.totalRevenue || 0).toLocaleString()}`}
              icon={ArrowTrendingUpIcon}
              trend={analytics?.revenueTrend}
            />
            <StatCard
              label="Monthly Revenue"
              value={`₹${(analytics?.monthlyRevenue || 0).toLocaleString()}`}
              icon={ArrowTrendingUpIcon}
              trend={analytics?.monthlyGrowth}
              subtext={`Daily: ₹${(analytics?.dailyRevenue || 0).toLocaleString()}`}
            />
            <StatCard
              label="Avg Customer Lifetime Value"
              value={`₹${(analytics?.avgCustomerLifetimeValue || 0).toLocaleString()}`}
              icon={SparklesIcon}
            />
            <StatCard
              label="Monthly Recurring Revenue"
              value={`₹${(analytics?.avgMonthlyRecurringRevenue || 0).toLocaleString()}`}
              icon={ArrowTrendingUpIcon}
            />
          </div>
        </div>

        {/* Users & Subscriptions */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">User & Subscription Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Total Users"
              value={(analytics?.totalUsers || 0).toLocaleString()}
              icon={SparklesIcon}
              trend={analytics?.userGrowth}
              subtext={`+${analytics?.newUsersThisMonth} this month`}
            />
            <StatCard
              label="Active Subscriptions"
              value={(analytics?.activeSubscriptions || 0).toLocaleString()}
              icon={CheckCircleIcon}
              subtext={`${(analytics?.trialSubscriptions || 0)} trials`}
            />
            <StatCard
              label="Expired Subscriptions"
              value={(analytics?.expiredSubscriptions || 0).toLocaleString()}
              icon={XCircleIcon}
            />
            <StatCard
              label="Churn Rate"
              value={`${(analytics?.churnRate || 0).toFixed(2)}%`}
              icon={ArrowTrendingUpIcon}
            />
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Plan Distribution */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
            <h3 className="text-lg font-bold text-white mb-6">Subscription Distribution</h3>
            <div className="space-y-4">
              {analytics?.planDistribution.map((plan) => {
                const total = analytics.activeSubscriptions + analytics.expiredSubscriptions + analytics.trialSubscriptions;
                const percentage = ((plan.count / total) * 100).toFixed(1);
                return (
                  <div key={plan.plan}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 font-medium capitalize">{plan.plan}</span>
                      <span className="text-white font-bold">{plan.count}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{percentage}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue by Plan */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
            <h3 className="text-lg font-bold text-white mb-6">Revenue by Plan</h3>
            <div className="space-y-4">
              {analytics?.revenueByPlan.map((plan) => {
                const total = analytics.totalRevenue;
                const percentage = ((plan.revenue / total) * 100).toFixed(1);
                return (
                  <div key={plan.plan}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 font-medium capitalize">{plan.plan}</span>
                      <span className="text-white font-bold">₹{plan.revenue.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{percentage}% of total</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Insights */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
          <h3 className="text-lg font-bold text-white mb-6">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <p className="text-gray-400 text-sm mb-2">Most Popular Plan</p>
              <p className="text-2xl font-bold text-white capitalize">{analytics?.topPlan}</p>
              <p className="text-xs text-gray-400 mt-2">Drives most subscriptions</p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <p className="text-gray-400 text-sm mb-2">Weekly Revenue</p>
              <p className="text-2xl font-bold text-white">₹{(analytics?.weeklyRevenue || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-2">This week</p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <p className="text-gray-400 text-sm mb-2">Conversion Efficiency</p>
              <p className="text-2xl font-bold text-white">
                {((analytics?.activeSubscriptions || 0) / (analytics?.totalUsers || 1) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-2">Users with active subscriptions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
