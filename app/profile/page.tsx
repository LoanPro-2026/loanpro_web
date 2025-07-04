'use client';
import React, { useEffect, useState } from 'react';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DownloadIcon from '@mui/icons-material/Download';
import SecurityIcon from '@mui/icons-material/Security';
import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';

interface PaymentHistoryEntry {
  paymentId: string;
  plan: string;
  startDate: string;
  endDate: string;
  status: string;
  receiptUrl?: string;
}

interface UserProfile {
  user: {
    accessToken: string;
    username: string;
    email: string;
  };
  subscription: {
    plan: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  paymentHistory: PaymentHistoryEntry[];
}

const TABS = [
  { label: 'Dashboard' },
  { label: 'Profile' },
];

const ProfilePage = () => {
  const [data, setData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const { user, isLoaded: clerkLoaded } = useUser();
  const { openUserProfile } = useClerk();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/user-profile');
        if (!res.ok) throw new Error('Failed to fetch profile');
        const json = await res.json();
        setData(json);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('Error fetching profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleCopy = () => {
    if (data?.user?.accessToken) {
      navigator.clipboard.writeText(data.user.accessToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleRegenerate = () => {
    // Placeholder for regenerate logic
    alert('Regenerate token feature coming soon!');
  };

  if (loading || !clerkLoaded) return <div className="flex justify-center items-center min-h-[60vh]">Loading...</div>;
  if (error) return <div className="flex justify-center items-center min-h-[60vh] text-red-600">{error}</div>;
  if (!data) return null;

  // Helper for colored badge
  const Badge = ({ text, color }: { text: string; color: string }) => (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${color}`}>{text}</span>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-white to-blue-50 flex flex-col items-center py-12 px-2">
      <div className="w-full max-w-5xl">
        {/* Tabs */}
        <div className="flex gap-8 border-b border-gray-200 mb-10">
          {TABS.map((tab, idx) => (
            <button
              key={tab.label}
              className={`py-3 px-2 text-lg font-semibold focus:outline-none transition border-b-2 ${activeTab === idx ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
              onClick={() => setActiveTab(idx)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Dashboard Tab */}
        {activeTab === 0 && (
          <>
            <div className="flex flex-col md:flex-row gap-8 mb-12">
              {/* Subscription Details */}
              <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <BadgeIcon className="text-2xl text-green-600" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Subscription Details</h2>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center mb-2">
                    <Badge text={data.subscription.plan} color="bg-blue-100 text-blue-800" />
                    <Badge text={data.subscription.status} color={data.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} />
                  </div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {data.subscription.plan.charAt(0).toUpperCase() + data.subscription.plan.slice(1)} Plan
                  </div>
                  <div className="flex flex-wrap gap-6 mb-2">
                    <div className="text-gray-700 dark:text-gray-200 text-base font-medium">Start: <span className="font-mono font-semibold">{new Date(data.subscription.startDate).toLocaleDateString()}</span></div>
                    <div className="text-gray-700 dark:text-gray-200 text-base font-medium">End: <span className="font-mono font-semibold">{new Date(data.subscription.endDate).toLocaleDateString()}</span></div>
                  </div>
                  <div className="text-gray-700 text-sm mb-4">Next renewal on {new Date(data.subscription.endDate).toLocaleDateString()}</div>
                  <div className="flex gap-4 mt-4">
                    <Link href="/subscribe">
                      <button className="px-4 py-2 bg-gray-100 text-blue-700 rounded font-semibold border border-blue-200 hover:bg-blue-50 transition w-fit">Upgrade Plan</button>
                    </Link>
                    <button className="px-4 py-2 bg-red-100 text-red-700 rounded font-semibold border border-red-200 hover:bg-red-200 transition w-fit">Cancel Subscription</button>
                  </div>
                </div>
              </div>
              {/* Download LoanPro Software Card */}
              <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                <DownloadIcon className="text-5xl text-blue-700 mb-4" />
                <div className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">Download LoanPro Software</div>
                <div className="text-gray-800 mb-4">Get the official LoanPro desktop app for Windows. Fast, secure, and easy to use.</div>
                <a href="/downloads/LoanProSetup.exe" download className="px-5 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition">Download for Windows</a>
              </div>
            </div>
            {/* Payment History Section */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800 mb-12 mt-2">
              <div className="flex items-center gap-3 mb-4">
                <BadgeIcon className="text-2xl text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-700 dark:text-gray-200 border-b">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.paymentHistory.length === 0 && (
                      <tr><td colSpan={4} className="py-4 text-center text-gray-400">No payment history found.</td></tr>
                    )}
                    {data.paymentHistory.map((entry, idx) => (
                      <tr key={entry.paymentId || idx} className="border-b last:border-b-0">
                        <td className="py-2 pr-4 text-gray-900 dark:text-gray-100 font-medium">{new Date(entry.startDate).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">
                          <Badge text={entry.plan} color="bg-blue-100 text-blue-800" />
                        </td>
                        <td className="py-2 pr-4">
                          <Badge text={entry.status} color={entry.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} />
                        </td>
                        <td className="py-2 pr-4">
                          {entry.receiptUrl ? (
                            <a href={entry.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Access Token Management */}
            <div className="mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <VpnKeyIcon className="text-2xl text-yellow-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Access Token Management</h2>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={data.user.accessToken}
                    readOnly
                    className="font-mono text-xs bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded w-full border border-blue-200 dark:border-blue-700 focus:outline-none text-gray-900 dark:text-gray-100 shadow-inner"
                    style={{ letterSpacing: '0.05em' }}
                  />
                  <button
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-semibold"
                    onClick={handleCopy}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-semibold"
                    onClick={() => setShowToken((s) => !s)}
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <button
                  className="px-4 py-2 bg-red-100 text-red-700 rounded font-semibold border border-red-200 hover:bg-red-200 transition text-sm"
                  onClick={handleRegenerate}
                >
                  Regenerate
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">Keep your access token secure. Use it only in the official desktop app.</div>
            </div>
          </>
        )}
        {/* Profile Tab */}
        {activeTab === 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800 mb-12 flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 pr-8 mb-8 md:mb-0">
              <div className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Account</div>
              <div className="text-gray-600 mb-6">Manage your account info.</div>
              <div className="flex flex-col gap-2">
                <button className="flex items-center gap-2 px-3 py-2 rounded bg-blue-50 text-blue-700 font-semibold" onClick={() => openUserProfile()}><AccountCircleIcon /> Profile</button>
                <button className="flex items-center gap-2 px-3 py-2 rounded text-gray-600 hover:bg-gray-100 font-semibold" onClick={() => openUserProfile()}><SecurityIcon /> Security</button>
              </div>
            </div>
            {/* Main Profile Details */}
            <div className="flex-1">
              <div className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">Profile details</div>
              <div className="flex items-center gap-4 mb-6">
                <img src={user?.imageUrl} alt="Profile" className="w-16 h-16 rounded-full border border-gray-200" />
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user?.fullName}</div>
                <button className="ml-auto px-4 py-2 bg-gray-100 text-blue-700 rounded font-semibold border border-blue-200 hover:bg-blue-50 transition text-sm" onClick={() => openUserProfile()}>Update profile</button>
              </div>
              <div className="mb-6">
                <div className="text-gray-700 font-semibold mb-1">Email addresses</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-800 font-mono">{user?.primaryEmailAddress?.emailAddress}</span>
                  <span className="bg-gray-200 text-xs px-2 py-0.5 rounded">Primary</span>
                </div>
                <button className="text-blue-600 hover:underline text-sm font-medium" onClick={() => openUserProfile()}>+ Add email address</button>
              </div>
              <div>
                <div className="text-gray-700 font-semibold mb-1">Connected accounts</div>
                <button className="text-blue-600 hover:underline text-sm font-medium" onClick={() => openUserProfile()}>+ Connect account</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage; 