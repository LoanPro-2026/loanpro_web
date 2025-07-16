'use client';
import React, { useEffect, useState } from 'react';
import { 
  UserCircleIcon, 
  CreditCardIcon, 
  KeyIcon, 
  ArrowDownTrayIcon, 
  ShieldCheckIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  XMarkIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import Script from 'next/script';
import DeviceManagement from '@/components/DeviceManagement';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

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
    accessToken: string | null;
    username: string;
    email: string;
  };
  subscription: {
    plan: string;
    status: string;
    startDate: string;
    endDate: string;
    billingPeriod?: 'monthly' | 'annually';
  } | null;
  paymentHistory: PaymentHistoryEntry[];
  isSubscribed: boolean;
}

// Modal interfaces
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  onUpgrade: (plan: string, billingPeriod?: 'monthly' | 'annually') => void;
}

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: (reason: string) => void;
  refundInfo: any;
}

interface RenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  currentBillingPeriod: 'monthly' | 'annually';
  onRenew: (billingPeriod?: 'monthly' | 'annually') => void;
}

const TABS = [
  { label: 'Dashboard', icon: ChartBarIcon },
  { label: 'Analytics', icon: ChartBarIcon },
  { label: 'Devices', icon: ComputerDesktopIcon },
  { label: 'Profile', icon: UserCircleIcon },
];

// Upgrade Modal Component
const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentPlan, onUpgrade }) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');
  const [upgradeCalculation, setUpgradeCalculation] = useState<any>(null);
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  
  const plans = [
    { name: 'basic', price: 499, description: 'Perfect for small businesses' },
    { name: 'pro', price: 999, description: 'Great for growing companies' },
    { name: 'enterprise', price: 1499, description: 'For large organizations' }
  ];
  
  const availableUpgrades = plans.filter(plan => {
    const hierarchy = { trial: 0, basic: 1, pro: 2, enterprise: 3 };
    // Normalize current plan to lowercase for comparison
    const normalizedCurrentPlan = currentPlan.toLowerCase();
    const currentLevel = hierarchy[normalizedCurrentPlan as keyof typeof hierarchy] ?? 0;
    return hierarchy[plan.name as keyof typeof hierarchy] > currentLevel;
  });

  // Fetch upgrade calculation when plan or billing period changes
  useEffect(() => {
    if (selectedPlan && isOpen) {
      fetchUpgradeCalculation();
    }
  }, [selectedPlan, billingPeriod, isOpen]);

  const fetchUpgradeCalculation = async () => {
    if (!selectedPlan) return;
    
    setLoadingCalculation(true);
    try {
      const response = await fetch(`/api/upgrade-plan?newPlan=${selectedPlan}&billingPeriod=${billingPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setUpgradeCalculation(data.calculation);
      } else {
        console.error('Failed to fetch upgrade calculation');
        setUpgradeCalculation(null);
      }
    } catch (error) {
      console.error('Error fetching upgrade calculation:', error);
      setUpgradeCalculation(null);
    } finally {
      setLoadingCalculation(false);
    }
  };

  const getDisplayPrice = (plan: any) => {
    const monthlyPrice = plan.price;
    if (billingPeriod === 'annually') {
      const annualPrice = Math.round(monthlyPrice * 12 * 0.85); // 15% discount
      return { price: annualPrice, period: '/year', savings: `Save ${Math.round(monthlyPrice * 12 * 0.15)}` };
    }
    return { price: monthlyPrice, period: '/month', savings: null };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpIcon className="w-6 h-6 text-blue-600" />
            Upgrade Your Plan
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Current Plan: <span className="font-semibold text-blue-600">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</span>
        </p>

        {availableUpgrades.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">You're already on the highest plan!</p>
            <p className="text-sm text-gray-400">No upgrades available for your current plan.</p>
          </div>
        )}

        {availableUpgrades.length > 0 && (
          <>
            {/* Billing Period Toggle */}
            <div className="mb-6">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    billingPeriod === 'monthly' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annually')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    billingPeriod === 'annually' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600'
                  }`}
                >
                  Annual <span className="text-green-600 text-xs">(Save 15%)</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {availableUpgrades.map((plan) => {
                const pricing = getDisplayPrice(plan);
                return (
                  <div
                    key={plan.name}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                      selectedPlan === plan.name
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedPlan(plan.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 capitalize">{plan.name}</h3>
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">₹{pricing.price}{pricing.period}</div>
                        {pricing.savings && (
                          <div className="text-xs text-green-600 font-medium">{pricing.savings}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {selectedPlan && (
              <div className="mt-6 p-4 bg-blue-50/50 rounded-xl">
                {loadingCalculation ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Calculating upgrade cost...</p>
                  </div>
                ) : upgradeCalculation ? (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">Upgrade Cost Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      {upgradeCalculation.isTrialUpgrade ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trial Upgrade to {upgradeCalculation.newPlan}:</span>
                            <span className="font-medium">₹{upgradeCalculation.upgradeAmount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gateway Fee:</span>
                            <span className="font-medium">₹{upgradeCalculation.gatewayFee}</span>
                          </div>
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between font-bold">
                              <span>Total Amount:</span>
                              <span className="text-blue-600">₹{upgradeCalculation.totalAmount}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Current Plan Value (Remaining {upgradeCalculation.daysRemaining} days):</span>
                            <span className="font-medium">₹{upgradeCalculation.proratedCurrent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">New Plan Value (Remaining {upgradeCalculation.daysRemaining} days):</span>
                            <span className="font-medium">₹{upgradeCalculation.proratedNew}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Upgrade Amount:</span>
                            <span className="font-medium">₹{upgradeCalculation.upgradeAmount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gateway Fee:</span>
                            <span className="font-medium">₹{upgradeCalculation.gatewayFee}</span>
                          </div>
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between font-bold">
                              <span>Total Amount:</span>
                              <span className="text-blue-600">₹{upgradeCalculation.totalAmount}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      This is the exact amount you'll be charged at the payment gateway.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    {currentPlan.toLowerCase() === 'trial' 
                      ? "You'll be charged the full amount for your selected plan and trial will be converted to a paid subscription."
                      : "You'll be charged pro-rated amount for the remaining days of your current billing cycle."
                    }
                  </p>
                )}
              </div>
            )}
          </>
        )}
        
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {availableUpgrades.length === 0 ? 'Close' : 'Cancel'}
          </button>
          {availableUpgrades.length > 0 && (
            <button
              onClick={() => selectedPlan && onUpgrade(selectedPlan, billingPeriod)}
              disabled={!selectedPlan}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upgrade Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Cancel Modal Component
const CancelModal: React.FC<CancelModalProps> = ({ isOpen, onClose, onCancel, refundInfo }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  
  const predefinedReasons = [
    'Too expensive',
    'Not using enough',
    'Found better alternative',
    'Technical issues',
    'Other'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            Cancel Subscription
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        {refundInfo && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-6 text-lg">Refund Calculation</h3>
            <div className="grid grid-cols-1 gap-4 text-base">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="text-gray-700 font-medium">Total Paid:</span>
                <span className="font-bold text-gray-900 text-lg">₹{refundInfo?.totalPaid || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="text-gray-700 font-medium">Days Used:</span>
                <span className="font-bold text-gray-900 text-lg">{refundInfo?.daysUsed || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="text-gray-700 font-medium">Gateway Fee Deduction:</span>
                <span className="font-bold text-red-600 text-lg">₹{refundInfo?.gatewayFeeDeduction || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-300">
                <span className="text-green-700 font-bold">Net Refund:</span>
                <span className="font-bold text-green-700 text-xl">₹{refundInfo?.netRefund || 0}</span>
              </div>
            </div>
            {refundInfo?.message && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">{refundInfo.message}</p>
              </div>
            )}
            <p className="text-xs text-gray-600 mt-4 font-medium">
              * Refund will be processed manually within 3-5 business days
            </p>
          </div>
        )}
        
        <div className="mb-6">
          <label className="block text-lg font-bold text-gray-900 mb-4">
            Why are you cancelling? (Optional)
          </label>
          <div className="space-y-3 mb-4">
            {predefinedReasons.map((preReason) => (
              <label key={preReason} className="flex items-center p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={preReason}
                  checked={reason === preReason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mr-3 w-4 h-4 text-blue-600"
                />
                <span className="text-gray-900 font-medium">{preReason}</span>
              </label>
            ))}
          </div>
          
          {reason === 'Other' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please tell us more:
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please describe your reason for cancellation..."
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                rows={3}
              />
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Keep Subscription
          </button>
          <button
            onClick={() => onCancel(reason === 'Other' ? customReason : reason)}
            className="flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-700 transition-colors"
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
};

// Renew Modal Component
const RenewModal: React.FC<RenewModalProps> = ({ isOpen, onClose, currentPlan, currentBillingPeriod, onRenew }) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>(currentBillingPeriod);
  
  // Plan pricing (monthly rates)
  const planPrices: { [key: string]: number } = {
    basic: 499,
    pro: 999,
    enterprise: 1499
  };
  
  const getDisplayPrice = () => {
    const monthlyPrice = planPrices[currentPlan.toLowerCase()] || 0;
    if (billingPeriod === 'annually') {
      const annualPrice = Math.round(monthlyPrice * 12 * 0.85); // 15% discount
      return { price: annualPrice, period: '/year', savings: `Save ${Math.round(monthlyPrice * 12 * 0.15)}` };
    }
    return { price: monthlyPrice, period: '/month', savings: null };
  };

  const pricing = getDisplayPrice();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowPathIcon className="w-6 h-6 text-green-600" />
            Renew Subscription
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowPathIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Renew Your {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
          </h3>
          <p className="text-gray-600">
            Continue enjoying all the features with uninterrupted access
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                billingPeriod === 'monthly' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annually')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                billingPeriod === 'annually' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600'
              }`}
            >
              Annual <span className="text-green-600 text-xs">(Save 15%)</span>
            </button>
          </div>
        </div>
        
        {/* Pricing Display */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              ₹{pricing.price}{pricing.period}
            </div>
            {pricing.savings && (
              <div className="text-sm text-green-600 font-medium mb-2">{pricing.savings}</div>
            )}
            <div className="text-sm text-gray-600">
              {billingPeriod === 'annually' ? 'Billed annually' : 'Billed monthly'}
            </div>
          </div>
        </div>

        {/* Features Reminder */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">What you'll continue to get:</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>All {currentPlan} plan features</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Uninterrupted access to your data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Priority customer support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Latest updates and features</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-6 text-center">
          * Your new subscription period will start immediately after payment
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onRenew(billingPeriod)}
            className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Renew Now
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const [data, setData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [refundInfo, setRefundInfo] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
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

  const handleUpgrade = async (newPlan: string, billingPeriod: 'monthly' | 'annually' = 'monthly') => {
    try {
      setProcessing(true);
      
      // Get upgrade calculation
      const calcResponse = await fetch(`/api/upgrade-plan?newPlan=${newPlan}&billingPeriod=${billingPeriod}`);
      if (!calcResponse.ok) throw new Error('Failed to calculate upgrade cost');
      
      const { calculation } = await calcResponse.json();
      
      // Create upgrade order
      const orderResponse = await fetch('/api/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlan, billingPeriod }),
      });
      
      if (!orderResponse.ok) throw new Error('Failed to create upgrade order');
      
      const orderData = await orderResponse.json();
      
      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount, // Amount is already in paise from backend
        currency: 'INR',
        name: 'LoanPro',
        description: `Upgrade to ${newPlan} Plan`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const paymentResponse = await fetch('/api/payment-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                userId: user?.id,
                username: user?.fullName || user?.username,
                plan: newPlan,
                billingPeriod: billingPeriod, // Add billing period to upgrade payment success
                isUpgrade: true
              }),
            });
            
            if (paymentResponse.ok) {
              alert('Plan upgraded successfully!');
              window.location.reload();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment successful but verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
        },
        theme: { color: '#8B5CF6' }
      };
      
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
      
    } catch (error: any) {
      console.error('Upgrade error:', error);
      alert(error.message || 'Failed to process upgrade');
    } finally {
      setProcessing(false);
      setUpgradeModalOpen(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      // Get cancellation details
      const response = await fetch('/api/cancel-subscription');
      if (!response.ok) throw new Error('Failed to get cancellation details');
      
      const data = await response.json();
      console.log('Cancel modal - Received data:', data);
      console.log('Cancel modal - Refund calculation:', data.refundCalculation);
      setRefundInfo(data.refundCalculation);
      setCancelModalOpen(true);
    } catch (error: any) {
      console.error('Cancel request error:', error);
      alert(error.message || 'Failed to get cancellation details');
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    try {
      setProcessing(true);
      
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) throw new Error('Failed to cancel subscription');
      
      const result = await response.json();
      alert(`Subscription cancelled successfully! ${result.message}`);
      window.location.reload();
      
    } catch (error: any) {
      console.error('Cancel confirmation error:', error);
      alert(error.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
      setCancelModalOpen(false);
    }
  };

  const handleUpgradeModalClose = () => {
    setUpgradeModalOpen(false);
  };

  const handleCancelModalClose = () => {
    setCancelModalOpen(false);
    setRefundInfo(null);
  };

  const handleRenew = async (billingPeriod: 'monthly' | 'annually' = 'monthly') => {
    try {
      setProcessing(true);
      
      if (!data?.subscription?.plan) {
        throw new Error('No active subscription found');
      }

      // Create renewal order using create-order API
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: data.subscription.plan.charAt(0).toUpperCase() + data.subscription.plan.slice(1), // Capitalize for API
          billingPeriod 
        }),
      });
      
      if (!orderResponse.ok) throw new Error('Failed to create renewal order');
      
      const orderData = await orderResponse.json();
      
      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'LoanPro',
        description: `Renew ${data.subscription.plan.charAt(0).toUpperCase() + data.subscription.plan.slice(1)} Plan`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const paymentResponse = await fetch('/api/payment-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                userId: user?.id,
                username: user?.fullName || user?.username,
                plan: data.subscription ? data.subscription.plan.charAt(0).toUpperCase() + data.subscription.plan.slice(1) : '',
                billingPeriod: billingPeriod,
                isRenewal: true
              }),
            });
            
            if (paymentResponse.ok) {
              alert('Subscription renewed successfully!');
              window.location.reload();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment successful but verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
        },
        theme: { color: '#10B981' }
      };
      
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
      
    } catch (error: any) {
      console.error('Renewal error:', error);
      alert(error.message || 'Failed to process renewal');
    } finally {
      setProcessing(false);
      setRenewModalOpen(false);
    }
  };

  const handleRenewModalClose = () => {
    setRenewModalOpen(false);
  };

  // Utility function to check if subscription needs renewal
  const needsRenewal = () => {
    if (!data?.subscription?.endDate || data.subscription.endDate === 'Invalid Date') {
      return false;
    }
    
    const endDate = new Date(data.subscription.endDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Show renew if expired or expiring within 7 days
    return daysUntilExpiry <= 7;
  };

  const isExpired = () => {
    if (!data?.subscription?.endDate || data.subscription.endDate === 'Invalid Date') {
      return false;
    }
    
    const endDate = new Date(data.subscription.endDate);
    const today = new Date();
    
    return endDate.getTime() < today.getTime();
  };

  // Badge component
  const Badge = ({ text, color }: { text: string; color: string }) => (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${color}`}>
      {text}
    </span>
  );

  if (loading || !clerkLoaded) return (
    <div className="relative min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading your profile...</p>
        </div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="relative min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 text-center">
          <div className="text-red-600 font-semibold">{error}</div>
        </div>
      </div>
    </div>
  );

  // Show subscription prompt for non-subscribed users
  if (data && !data.isSubscribed) {
    return (
      <div className="relative min-h-screen pt-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Welcome, 
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> {user?.firstName}</span>!
            </h1>
            <p className="text-xl text-gray-600">Ready to unlock the full potential of LoanPro?</p>
          </div>

          {/* Subscription Required Card */}
          <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-12 text-center shadow-2xl">
            {/* Icon */}
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <CreditCardIcon className="w-12 h-12 text-white" />
            </div>

            {/* Content */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Subscription Required
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              To access your complete profile, analytics, device management, and all advanced features, 
              you need an active subscription plan. Choose from our flexible plans designed for your business needs.
            </p>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-2xl p-6">
                <ChartBarIcon className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-sm text-gray-600">Track your loan portfolio performance</p>
              </div>
              <div className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-2xl p-6">
                <ComputerDesktopIcon className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Device Management</h3>
                <p className="text-sm text-gray-600">Manage your connected devices</p>
              </div>
              <div className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-2xl p-6">
                <ShieldCheckIcon className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Advanced Security</h3>
                <p className="text-sm text-gray-600">Biometric auth & access tokens</p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="space-y-4">
              <Link href="/subscribe">
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 mx-auto">
                  <span>Choose Your Plan</span>
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
              </Link>
              
              <p className="text-sm text-gray-500">
                💡 Start with a 14-day free trial - no credit card required
              </p>
            </div>

            {/* Basic User Info */}
            <div className="mt-12 pt-8 border-t border-white/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4">
                  <span className="text-gray-600">Username:</span>
                  <span className="text-gray-900 font-medium ml-2">{data.user.username || 'Not set'}</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900 font-medium ml-2">{data.user.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      
      <div className="relative min-h-screen pt-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Welcome back, 
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> {user?.firstName}</span>!
            </h1>
            <p className="text-xl text-gray-600">Manage your account, track analytics, and configure your loan management system.</p>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-2 mb-8">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab, idx) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.label}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      activeTab === idx 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                        : 'text-gray-700 hover:bg-white/30'
                    }`}
                    onClick={() => setActiveTab(idx)}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Dashboard Tab */}
          {activeTab === 0 && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Subscription Details */}
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 hover:bg-white/30 transition-all duration-300 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <CreditCardIcon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Subscription Details</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      {data?.subscription?.billingPeriod && (
                        <Badge text={data.subscription.billingPeriod} color="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200" />
                      )}
                      {data?.subscription && (
                        <Badge text={data.subscription.status} color={data.subscription.status === 'active' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200'} />
                      )}
                    </div>
                    
                    <div className="text-xl font-bold text-gray-900 mb-4">
                      {data?.subscription ? (data.subscription.plan.charAt(0).toUpperCase() + data.subscription.plan.slice(1) + ' Plan') : 'No Plan'}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/30 rounded-xl p-4">
                        <div className="text-sm text-gray-600 font-medium">Start Date</div>
                        <div className="text-lg font-bold text-gray-900">
                          {data?.subscription?.startDate ? new Date(data.subscription.startDate).toLocaleDateString() : '-'}
                        </div>
                      </div>
                      <div className="bg-white/30 rounded-xl p-4">
                        <div className="text-sm text-gray-600 font-medium">End Date</div>
                        <div className="text-lg font-bold text-gray-900">
                          {data?.subscription?.endDate && data.subscription.endDate !== 'Invalid Date' 
                            ? new Date(data.subscription.endDate).toLocaleDateString() 
                            : data?.subscription?.status === 'trial' ? 'Trial Period' : '-'
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-gray-600 text-sm mb-6 bg-blue-50/50 rounded-lg p-3">
                      <span className="font-medium">Next renewal:</span> {
                        data?.subscription?.endDate && data.subscription.endDate !== 'Invalid Date' 
                          ? new Date(data.subscription.endDate).toLocaleDateString() 
                          : data?.subscription?.status === 'trial' ? 'Upgrade to set renewal date' : '-'
                      }
                    </div>
                    
                    {/* Renewal Alert */}
                    {needsRenewal() && (
                      <div className={`${isExpired() ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border-2 rounded-xl p-4 mb-6`}>
                        <div className="flex items-center gap-3">
                          <ExclamationTriangleIcon className={`w-6 h-6 ${isExpired() ? 'text-red-600' : 'text-yellow-600'}`} />
                          <div>
                            <h4 className={`font-bold ${isExpired() ? 'text-red-900' : 'text-yellow-900'}`}>
                              {isExpired() ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                            </h4>
                            <p className={`text-sm ${isExpired() ? 'text-red-700' : 'text-yellow-700'}`}>
                              {isExpired() 
                                ? 'Your subscription has expired. Renew now to restore access to all features.'
                                : `Your subscription expires on ${new Date(data?.subscription?.endDate || '').toLocaleDateString()}. Renew now to avoid interruption.`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Show Renew button if subscription needs renewal */}
                      {needsRenewal() ? (
                        <>
                          <button 
                            onClick={() => setRenewModalOpen(true)}
                            disabled={processing}
                            className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? 'Processing...' : 'Renew Subscription'}
                          </button>
                          <button 
                            onClick={() => setUpgradeModalOpen(true)}
                            disabled={processing}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? 'Processing...' : 'Upgrade Plan'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => setUpgradeModalOpen(true)}
                            disabled={processing}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? 'Processing...' : 'Upgrade Plan'}
                          </button>
                          <button 
                            onClick={handleCancelRequest}
                            disabled={processing}
                            className="bg-white/40 hover:bg-red-50 text-red-600 font-semibold py-3 px-6 rounded-xl border border-red-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? 'Processing...' : 'Cancel'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Download Section */}
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 hover:bg-white/30 transition-all duration-300 shadow-xl text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                      <ArrowDownTrayIcon className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Download LoanPro Desktop</h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Get the official LoanPro desktop application for Windows. Experience lightning-fast performance with offline capabilities.
                    </p>
                    <Link href="/download">
                      <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        <span>Download for Windows</span>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
              {/* Payment History Section */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800 mb-12 mt-2">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCardIcon className="w-6 h-6 text-blue-600" />
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
                      {data?.paymentHistory?.length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-center text-gray-400">No payment history found.</td></tr>
                      )}
                      {data?.paymentHistory?.map((entry, idx) => (
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
                  <KeyIcon className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Access Token Management</h2>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 flex items-center gap-3">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={data?.user?.accessToken || 'No access token available'}
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
          {/* Analytics Tab */}
          {activeTab === 1 && (
            <AnalyticsDashboard />
          )}
          {/* Devices Tab */}
          {activeTab === 2 && (
            <DeviceManagement />
          )}
          {/* Profile Tab */}
          {activeTab === 3 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800 mb-12 flex flex-col md:flex-row gap-8">
              {/* Sidebar */}
              <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 pr-8 mb-8 md:mb-0">
                <div className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Account</div>
                <div className="text-gray-600 mb-6">Manage your account info.</div>
                <div className="flex flex-col gap-2">
                  <button className="flex items-center gap-2 px-3 py-2 rounded bg-blue-50 text-blue-700 font-semibold" onClick={() => openUserProfile()}><UserCircleIcon className="w-5 h-5" /> Profile</button>
                  <button className="flex items-center gap-2 px-3 py-2 rounded text-gray-600 hover:bg-gray-100 font-semibold" onClick={() => openUserProfile()}><ShieldCheckIcon className="w-5 h-5" /> Security</button>
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

        {/* Modals */}
        {upgradeModalOpen && data && (
          <UpgradeModal 
            isOpen={upgradeModalOpen} 
            onClose={handleUpgradeModalClose} 
            currentPlan={data.subscription?.plan || 'basic'} 
            onUpgrade={handleUpgrade} 
          />
        )}
        {renewModalOpen && data && (
          <RenewModal 
            isOpen={renewModalOpen} 
            onClose={handleRenewModalClose} 
            currentPlan={data.subscription?.plan || 'basic'} 
            currentBillingPeriod={data.subscription?.billingPeriod || 'monthly'}
            onRenew={handleRenew} 
          />
        )}
        {cancelModalOpen && (
          <CancelModal 
            isOpen={cancelModalOpen} 
            onClose={handleCancelModalClose} 
            onCancel={handleConfirmCancel} 
            refundInfo={refundInfo} 
          />
        )}
      </div>
    </>
  );
};

export default ProfilePage;