'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  totalEvents: number;
  avgDailyUsage: number;
  totalSessions: number;
  avgSessionDuration: number;
  dailyActivity: Array<{
    _id: string;
    events: number;
    uniqueFeatures: string[];
  }>;
  topFeatures: Array<{
    _id: string;
    count: number;
  }>;
  deviceUsage: Array<{
    _id: string;
    sessions: number;
    totalDuration: number;
    lastUsed: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsDashboard = () => {
  const { user } = useUser();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, user]);

  const fetchAnalytics = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?timeframe=${timeframe}&userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTimeframeLabel = (timeframe: string) => {
    switch (timeframe) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      default: return 'Last 30 days';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
        <div className="text-center py-8 text-gray-500">
          No usage data available yet. Start using the desktop app to see analytics here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AnalyticsIcon className="text-2xl text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Usage Analytics</h2>
          </div>
          
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <EventIcon className="text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{analytics.totalEvents}</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Total Events</div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <TrendingUpIcon className="text-green-600 mb-2" />
            <div className="text-2xl font-bold text-green-800 dark:text-green-200">{analytics.avgDailyUsage}</div>
            <div className="text-sm text-green-600 dark:text-green-400">Avg Daily Events</div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
            <AccessTimeIcon className="text-purple-600 mb-2" />
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">{analytics.totalSessions}</div>
            <div className="text-sm text-purple-600 dark:text-purple-400">Total Sessions</div>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
            <AccessTimeIcon className="text-orange-600 mb-2" />
            <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">{formatDuration(analytics.avgSessionDuration)}</div>
            <div className="text-sm text-orange-600 dark:text-orange-400">Avg Session</div>
          </div>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Daily Activity - {getTimeframeLabel(timeframe)}
        </h3>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="events" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Features */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Most Used Features</h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topFeatures.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Usage */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Device Usage</h3>
          
          <div className="space-y-4">
            {analytics.deviceUsage.map((device, index) => (
              <div key={device._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Device {device._id.slice(0, 8)}...
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Last used: {new Date(device.lastUsed).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {device.sessions} sessions
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDuration(device.totalDuration)}
                  </div>
                </div>
              </div>
            ))}
            
            {analytics.deviceUsage.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No device usage data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">💡 Usage Insights</h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          {analytics.avgDailyUsage > 50 && (
            <p>• You're a power user! Your high activity shows excellent engagement with the app.</p>
          )}
          {analytics.avgSessionDuration > 30 && (
            <p>• Your long session times indicate deep work sessions - great productivity!</p>
          )}
          {analytics.topFeatures.length > 5 && (
            <p>• You're exploring many features - you're getting the most out of LoanPro!</p>
          )}
          {analytics.deviceUsage.length > 1 && (
            <p>• Using multiple devices shows you value flexibility in your workflow.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
