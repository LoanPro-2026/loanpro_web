'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  ExclamationTriangleIcon,
  SparklesIcon,
  CheckIcon,
  ChevronDownIcon,
  XCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import Script from 'next/script';
import DeviceManagement from '@/components/DeviceManagement';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { toUserFriendlyToastError } from '@/lib/toastErrorMessage';

interface PaymentHistoryEntry {
  id: string;
  type: 'payment' | 'cancellation';
  action: 'purchase' | 'renewal' | 'upgrade' | 'cancellation';
  plan: string;
  billingPeriod?: 'monthly' | 'annually';
  amount: number;
  status: string;
  date: string;
  receiptUrl?: string;
  refundAmount?: number;
  totalPaid?: number;
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
    cancelledDate?: string;
    cancellationReason?: string;
  } | null;
  cancellation?: {
    reason?: string;
    cancelledDate?: string;
    refundStatus?: string;
    refundAmount?: number;
    totalPaid?: number;
    daysUsed?: number;
  } | null;
  paymentHistory: PaymentHistoryEntry[];
  isSubscribed: boolean;
}

// Modal interfaces
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  currentBillingPeriod: 'monthly' | 'annually';
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
  onRenew: (plan: string, billingPeriod?: 'monthly' | 'annually') => void;
}

interface StatusModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const TABS = [
  { label: 'Dashboard', icon: ChartBarIcon },
  { label: 'Devices', icon: ComputerDesktopIcon },
  { label: 'Profile', icon: UserCircleIcon },
];

// Upgrade Modal Component
const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentPlan, currentBillingPeriod, onUpgrade }) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>(currentBillingPeriod);
  const [upgradeCalculation, setUpgradeCalculation] = useState<any>(null);
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // Updated prices to match backend pricing
  const plans = [
    { 
      name: 'basic', 
      price: 599, 
      description: 'Perfect for small businesses',
      icon: '📦',
      features: ['Unlimited active records', '1 app device', 'Email support']
    },
    { 
      name: 'pro', 
      price: 899, 
      description: 'Great for growing companies',
      icon: '🚀',
      features: ['Unlimited active records', 'Mobile sync', 'Cloud backup', 'Priority support']
    },
    { 
      name: 'enterprise', 
      price: 1399, 
      description: 'For large organizations',
      icon: '⚡',
      features: ['Everything in Pro', '2 app devices per token', 'Custom workflows', 'Phone support']
    }
  ];

  const availableUpgrades = plans.filter(plan => {
    const hierarchy = { trial: 0, basic: 1, pro: 2, enterprise: 3 };
    const normalizedCurrentPlan = currentPlan.toLowerCase();
    const currentLevel = hierarchy[normalizedCurrentPlan as keyof typeof hierarchy] ?? 0;
    return hierarchy[plan.name as keyof typeof hierarchy] > currentLevel;
  });

  useEffect(() => {
    if (selectedPlan && isOpen) {
      fetchUpgradeCalculation();
    }
  }, [selectedPlan, billingPeriod, isOpen]);

  const fetchUpgradeCalculation = async () => {
    if (!selectedPlan) return;

    setLoadingCalculation(true);
    try {
      const capitalizedPlan = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1).toLowerCase();
      console.log('[fetchUpgradeCalculation] Fetching for:', capitalizedPlan, billingPeriod);
      const response = await fetch(`/api/upgrade-plan?newPlan=${capitalizedPlan}&billingPeriod=${billingPeriod}`);
      console.log('[fetchUpgradeCalculation] Response status:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('[fetchUpgradeCalculation] Full response data:', data);
        const calculation = data.data?.calculation || data.calculation;
        console.log('[fetchUpgradeCalculation] Calculation object:', calculation);
        setUpgradeCalculation(calculation);
      } else {
        const errorData = await response.text();
        console.error('[fetchUpgradeCalculation] Failed to fetch:', response.status, errorData);
        setUpgradeCalculation(null);
      }
    } catch (error) {
      console.error('[fetchUpgradeCalculation] Error:', error);
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <SparklesIcon className="w-7 h-7" />
                Upgrade Your Plan
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Current: <span className="font-semibold">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</span>
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {availableUpgrades.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-900 font-semibold text-lg mb-2">You're on the Best Plan!</p>
              <p className="text-gray-600 text-sm">No upgrades available for your current plan.</p>
            </div>
          ) : (
            <>
              {/* Billing Period Toggle */}
              <div className="mb-6">
                {currentBillingPeriod === 'annually' && (
                  <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                    <p className="text-sm text-blue-900 flex items-start gap-2">
                      <span className="text-lg">ℹ️</span>
                      <span><span className="font-semibold">Note:</span> Annual plans can only be upgraded to annual billing. Monthly billing switch is not available during upgrades.</span>
                    </p>
                  </div>
                )}
                <div className="flex bg-gray-100 rounded-xl p-1.5 shadow-inner">
                  <button
                    onClick={() => currentBillingPeriod !== 'annually' && setBillingPeriod('monthly')}
                    disabled={currentBillingPeriod === 'annually'}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                      billingPeriod === 'monthly' 
                        ? 'bg-white text-gray-900 shadow-md' 
                        : currentBillingPeriod === 'annually'
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod('annually')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                      billingPeriod === 'annually' 
                        ? 'bg-white text-gray-900 shadow-md' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Annual <span className="text-green-600 text-xs ml-1">💰 Save 15%</span>
                  </button>
                </div>
              </div>
              
              {/* Plan Selection Cards */}
              <div className="space-y-4 mb-6">
                {availableUpgrades.map((plan) => {
                  const pricing = getDisplayPrice(plan);
                  const isSelected = selectedPlan === plan.name;
                  return (
                    <div
                      key={plan.name}
                      className={`relative border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg scale-[1.02]'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-md bg-white'
                      }`}
                      onClick={() => setSelectedPlan(plan.name)}
                    >
                      {isSelected && (
                        <div className="absolute -top-3 -right-3 bg-blue-600 text-white rounded-full p-2 shadow-lg">
                          <CheckIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{plan.icon}</div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 capitalize">{plan.name}</h3>
                            <p className="text-sm text-gray-600">{plan.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">₹{pricing.price.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">{pricing.period}</div>
                          {pricing.savings && (
                            <div className="text-xs text-green-600 font-semibold mt-1">{pricing.savings}</div>
                          )}
                        </div>
                      </div>
                      {/* Features */}
                      <div className="flex flex-wrap gap-2">
                        {plan.features.map((feature, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
                            <CheckIcon className="w-3 h-3 text-green-600" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Cost Breakdown Section */}
              {selectedPlan && (
                <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-5 border border-gray-200">
                  {loadingCalculation ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
                      <p className="text-sm text-gray-700 font-medium">Calculating your upgrade cost...</p>
                    </div>
                  ) : upgradeCalculation ? (
                    <div>
                      {/* Summary */}
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 text-lg">Total Due Today</h4>
                        <div className="text-3xl font-bold text-blue-600">₹{upgradeCalculation.totalAmount?.toLocaleString()}</div>
                      </div>
                      
                      {/* Toggle Breakdown */}
                      <button
                        onClick={() => setShowBreakdown(!showBreakdown)}
                        className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 pb-3"
                      >
                        {showBreakdown ? 'Hide' : 'Show'} cost breakdown
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Detailed Breakdown */}
                      {showBreakdown && (
                        <div className="space-y-3 pt-3 border-t border-gray-200">
                          {upgradeCalculation.isTrialUpgrade ? (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-700">Plan Cost ({upgradeCalculation.newPlan})</span>
                                <span className="font-semibold text-gray-900">₹{upgradeCalculation.upgradeAmount?.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-700">Payment Gateway Fee</span>
                                <span className="font-semibold text-gray-900">₹{upgradeCalculation.gatewayFee}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-700">New Plan ({upgradeCalculation.daysRemaining} days)</span>
                                <span className="font-semibold text-green-600">₹{upgradeCalculation.proratedNew?.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-700">Current Plan Credit</span>
                                <span className="font-semibold text-red-600">-₹{upgradeCalculation.proratedCurrent?.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                                <span className="text-gray-700">Upgrade Amount</span>
                                <span className="font-semibold text-gray-900">₹{upgradeCalculation.upgradeAmount?.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-700">Payment Gateway Fee</span>
                                <span className="font-semibold text-gray-900">₹{upgradeCalculation.gatewayFee}</span>
                              </div>
                            </>
                          )}
                          <div className="pt-2 mt-2 border-t-2 border-gray-300">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-gray-900">Final Amount</span>
                              <span className="text-blue-600 text-lg">₹{upgradeCalculation.totalAmount?.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-4 text-center">
                        💳 Secure payment processed via Razorpay
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 text-center py-4">
                      {currentPlan.toLowerCase() === 'trial' 
                        ? "💡 You'll be charged the full amount for your selected plan. Your trial will be converted to a paid subscription."
                        : "💡 You'll only pay the prorated amount for the remaining days of your billing cycle."
                      }
                    </p>
                  )}
                </div>
              )}  
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-5 rounded-b-3xl flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all"
          >
            {availableUpgrades.length === 0 ? 'Close' : 'Maybe Later'}
          </button>
          {availableUpgrades.length > 0 && (
            <button
              onClick={() => selectedPlan && onUpgrade(selectedPlan, billingPeriod)}
              disabled={!selectedPlan || loadingCalculation}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loadingCalculation ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <ArrowUpIcon className="w-5 h-5" />
                  Upgrade Now {upgradeCalculation && `• ₹${upgradeCalculation.totalAmount?.toLocaleString()}`}
                </>
              )}
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
    { value: 'Too expensive', icon: '💰' },
    { value: 'Not using enough', icon: '⏰' },
    { value: 'Found better alternative', icon: '🔄' },
    { value: 'Technical issues', icon: '⚠️' },
    { value: 'Other', icon: '💭' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ExclamationTriangleIcon className="w-7 h-7" />
                Cancel Subscription
              </h2>
              <p className="text-red-100 text-sm mt-1">
                We're sorry to see you go. Help us improve!
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Manual Processing Banner */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🔒</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1 text-lg">Secure Refund Processing</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Your refund will be <span className="font-semibold text-blue-600">manually reviewed and processed by our team</span> within 3-5 business days. 
                  You'll receive an email confirmation once processed.
                </p>
              </div>
            </div>
          </div>

          {/* Refund Calculation */}
          {refundInfo && (
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5 text-gray-600" />
                Refund Calculation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-sm text-blue-700 font-medium mb-1">Total Paid</div>
                  <div className="text-2xl font-bold text-blue-900">₹{refundInfo?.totalPaid?.toLocaleString() || 0}</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="text-sm text-orange-700 font-medium mb-1">Days Used</div>
                  <div className="text-2xl font-bold text-orange-900">{refundInfo?.daysUsed || 0} days</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="text-sm text-red-700 font-medium mb-1">Gateway Deduction</div>
                  <div className="text-2xl font-bold text-red-900">-₹{refundInfo?.gatewayFeeDeduction || 0}</div>
                </div>
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                  <div className="text-sm text-green-700 font-bold mb-1 flex items-center gap-1">
                    <CheckIcon className="w-4 h-4" />
                    Net Refund Amount
                  </div>
                  <div className="text-3xl font-bold text-green-700">₹{refundInfo?.netRefund?.toLocaleString() || 0}</div>
                </div>
              </div>
              {refundInfo?.message && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-lg">ℹ️</span>
                    <span>{refundInfo.message}</span>
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Cancellation Reason */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-900 mb-4">
              Why are you cancelling? <span className="text-gray-500 font-normal text-sm">(Optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {predefinedReasons.map((preReason) => (
                <label 
                  key={preReason.value} 
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    reason === preReason.value 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={preReason.value}
                    checked={reason === preReason.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-5 h-5 text-blue-600 cursor-pointer"
                  />
                  <span className="text-2xl">{preReason.icon}</span>
                  <span className="text-gray-900 font-medium flex-1">{preReason.value}</span>
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
                  placeholder="Your feedback helps us improve our service..."
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-5 rounded-b-3xl flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all"
          >
            Keep Subscription
          </button>
          <button
            onClick={() => onCancel(reason === 'Other' ? customReason : reason)}
            className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <ExclamationTriangleIcon className="w-5 h-5" />
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
};

// Renew Modal Component
const RenewModal: React.FC<RenewModalProps> = ({ isOpen, onClose, currentPlan, currentBillingPeriod, onRenew }) => {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan.toLowerCase());
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>(currentBillingPeriod);
  
  // Plan pricing (monthly rates)
  const plans = [
    {
      name: 'basic',
      price: 599,
      description: 'Perfect for small businesses',
      icon: '📦',
      features: ['Unlimited active records', '1 app device', 'Email support']
    },
    {
      name: 'pro',
      price: 899,
      description: 'Great for growing companies',
      icon: '🚀',
      features: ['Unlimited active records', 'Mobile sync', 'Cloud backup', 'Priority support']
    },
    {
      name: 'enterprise',
      price: 1399,
      description: 'For large organizations',
      icon: '⚡',
      features: ['Everything in Pro', '2 app devices per token', 'Custom workflows', 'Phone support']
    }
  ];
  
  const getDisplayPrice = () => {
    const selected = plans.find(plan => plan.name === selectedPlan);
    const monthlyPrice = selected?.price || 0;
    if (billingPeriod === 'annually') {
      const annualPrice = Math.round(monthlyPrice * 12 * 0.85); // 15% discount
      return { price: annualPrice, period: '/year', savings: `Save ${Math.round(monthlyPrice * 12 * 0.15)}` };
    }
    return { price: monthlyPrice, period: '/month', savings: null };
  };

  const pricing = getDisplayPrice();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowPathIcon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Renew Your {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan
          </h3>
          <p className="text-gray-600">
            Continue enjoying all the features with uninterrupted access
          </p>
        </div>

        {/* Plan Selection */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Choose your plan</h4>
          <div className="grid gap-3">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.name;
              return (
                <button
                  key={plan.name}
                  onClick={() => setSelectedPlan(plan.name)}
                  className={`border rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{plan.icon}</span>
                        <span className="text-base font-semibold text-gray-900">
                          {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}
                        </span>
                        {plan.name === currentPlan.toLowerCase() && (
                          <span className="text-xs text-blue-600 font-semibold bg-blue-100 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">₹{plan.price}/mo</div>
                      {billingPeriod === 'annually' && (
                        <div className="text-xs text-green-600">
                          ₹{Math.round(plan.price * 12 * 0.85).toLocaleString()}/yr
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
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
              <span>All {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan features</span>
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
            onClick={() => onRenew(selectedPlan, billingPeriod)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
          >
            Renew Now
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}> = ({ isOpen, onClose, title, message, type }) => {
  if (!isOpen) return null;

  const styles =
    type === 'success'
      ? {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          button: 'bg-green-600 hover:bg-green-700',
        }
      : type === 'error'
      ? {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700',
        }
      : {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700',
        };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${styles.iconBg}`}>
                {type === 'success' ? (
                  <CheckIcon className={`w-6 h-6 ${styles.iconColor}`} />
                ) : type === 'error' ? (
                  <XCircleIcon className={`w-6 h-6 ${styles.iconColor}`} />
                ) : (
                  <ExclamationTriangleIcon className={`w-6 h-6 ${styles.iconColor}`} />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-700 whitespace-pre-line leading-relaxed">{message}</p>
        </div>

        <div className="p-6 pt-0 flex justify-end">
          <button
            onClick={onClose}
            className={`${styles.button} text-white font-semibold py-2.5 px-6 rounded-lg transition-colors`}
          >
            OK
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
  const [paymentHistoryPage, setPaymentHistoryPage] = useState(1);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentLoadingMessage, setPaymentLoadingMessage] = useState('');
  const [desktopIntentHandled, setDesktopIntentHandled] = useState(false);
  const [statusModal, setStatusModal] = useState<StatusModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  const { user, isLoaded: clerkLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [desktopSessionToken] = useState(() => (searchParams.get('desktopToken') || '').trim());
  const isDesktopBridge = (searchParams.get('source') || '').toLowerCase() === 'desktop_app' && !!desktopSessionToken;

  const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);

    if (isDesktopBridge && desktopSessionToken) {
      headers.set('x-desktop-access-token', desktopSessionToken);
      headers.set('x-desktop-source', 'electron_app');
    }

    return fetch(input, {
      ...init,
      headers,
    });
  };

  const openStatusModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusModal({ isOpen: true, title, message, type });
  };

  const closeStatusModal = () => {
    setStatusModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Protect route - redirect if not authenticated
  useEffect(() => {
    if (clerkLoaded && !user && !isDesktopBridge) {
      router.push('/sign-in');
    }
  }, [clerkLoaded, user, router, isDesktopBridge]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch('/api/user-profile');
        if (!res.ok) throw new Error('Failed to fetch profile');
        const json = await res.json();
        // Extract data from the API response wrapper
        setData(json.data || json);
      } catch (err) {
        setError(toUserFriendlyToastError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isDesktopBridge, desktopSessionToken]);

  useEffect(() => {
    if (data?.paymentHistory) {
      setPaymentHistoryPage(1);
    }
  }, [data?.paymentHistory?.length]);

  const handleCopy = () => {
    if (data?.user?.accessToken) {
      navigator.clipboard.writeText(data.user.accessToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const getTransactionLabel = (entry: PaymentHistoryEntry) => {
    if (entry.action === 'renewal') return 'Renewal';
    if (entry.action === 'upgrade') return 'Upgrade';
    if (entry.action === 'cancellation') return 'Cancellation';
    return 'Purchase';
  };

  const getTransactionStatus = (entry: PaymentHistoryEntry) => {
    const status = entry.status || 'completed';
    const normalized = status.toLowerCase();
    if (normalized === 'captured' || normalized === 'completed' || normalized === 'success') {
      return { label: 'Completed', color: 'bg-green-100 text-green-800' };
    }
    if (normalized === 'pending' || normalized === 'pending_review') {
      return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (normalized === 'refunded') {
      return { label: 'Refunded', color: 'bg-blue-100 text-blue-800' };
    }
    if (normalized === 'rejected' || normalized === 'failed') {
      return { label: 'Failed', color: 'bg-red-100 text-red-800' };
    }
    return { label: status, color: 'bg-slate-100 text-slate-600' };
  };

  const handleRegenerate = () => {
    openStatusModal(
      'Token Regeneration Support',
      'For security reasons, access token regeneration is handled through support verification. Please contact support@loanpro.tech from your registered account email to request token reset.',
      'info'
    );
  };

  const handleUpgrade = async (newPlan: string, billingPeriod: 'monthly' | 'annually' = 'monthly') => {
    try {
      setProcessing(true);
      setPaymentLoading(true);
      setPaymentLoadingMessage('Calculating upgrade cost...');
      
      // Capitalize plan name to match backend validation (Basic, Pro, Enterprise)
      const capitalizedPlan = newPlan.charAt(0).toUpperCase() + newPlan.slice(1).toLowerCase();
      
      // Get upgrade calculation
      const calcResponse = await authFetch(`/api/upgrade-plan?newPlan=${capitalizedPlan}&billingPeriod=${billingPeriod}`);
      if (!calcResponse.ok) throw new Error('Failed to calculate upgrade cost. Please try again.');
      
      const { calculation } = await calcResponse.json();
      
      setPaymentLoadingMessage('Creating payment order...');
      
      // Create upgrade order
      const orderResponse = await authFetch('/api/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlan: capitalizedPlan, billingPeriod }),
      });
      
      if (!orderResponse.ok) throw new Error('Failed to create upgrade order. Please try again.');
      
      const orderData = await orderResponse.json();
      
      setPaymentLoadingMessage('Opening secure payment gateway...');
      
      // Close modal before opening Razorpay
      setUpgradeModalOpen(false);
      
      // Small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Initialize Razorpay with improved UX
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'LoanPro',
        description: `Upgrade to ${capitalizedPlan} Plan`,
        image: '/logo.svg', // Add your logo here
        order_id: orderData.orderId,
        handler: async function (response: any) {
          setPaymentLoading(true);
          setPaymentLoadingMessage('Verifying payment...');
          
          try {
            console.log('[Razorpay] Payment successful:', response.razorpay_payment_id);
            
            const upgradeData = {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              userId: user?.id || user?.primaryEmailAddress?.emailAddress,
              username: user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress,
              plan: capitalizedPlan,
              billingPeriod: billingPeriod,
              isUpgrade: true
            };

            const paymentResponse = await fetch('/api/payment-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(upgradeData),
            });
            
            if (paymentResponse.ok) {
              const result = await paymentResponse.json();
              console.log('[Payment] Verification successful:', result);
              setPaymentLoadingMessage('Success! Refreshing your account...');
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              const errorData = await paymentResponse.json();
              console.error('[Payment] Verification failed:', errorData);
              throw new Error(errorData.error || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('[Payment] Verification error:', error);
            setPaymentLoading(false);
            openStatusModal(
              'Payment Verification Issue',
              `Your payment was processed successfully, but we couldn't verify it automatically.\n\nPayment ID: ${response.razorpay_payment_id}\n\nPlease contact support with this Payment ID. We'll activate your subscription manually.`,
              'error'
            );
          }
        },
        modal: {
          ondismiss: function() {
            setPaymentLoading(false);
            setPaymentLoadingMessage('');
            console.log('[Razorpay] Payment cancelled by user');
          },
          escape: true,
          animation: true,
          confirm_close: true
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
          contact: ''
        },
        notes: {
          user_id: user?.id || '',
          plan: capitalizedPlan,
          billing_period: billingPeriod
        },
        theme: { 
          color: '#6366F1', // Indigo-600 to match your brand
          backdrop_color: 'rgba(0, 0, 0, 0.7)'
        },
        retry: {
          enabled: true,
          max_count: 3
        }
      };
      
      setPaymentLoading(false);
      const razorpay = new (window as any).Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any){
        console.error('[Razorpay] Payment failed:', response.error);
        openStatusModal(
          'Payment Failed',
          `${response.error.description || 'Transaction was declined'}\n\nError Code: ${response.error.code}\n\nPlease try again or contact support if the issue persists.`,
          'error'
        );
      });
      
      razorpay.open();
      
    } catch (error: any) {
      console.error('[Upgrade] Error:', error);
      openStatusModal(
        'Upgrade Failed',
        `${toUserFriendlyToastError(error)}\n\nPlease try again or contact support if the issue persists.`,
        'error'
      );
      setPaymentLoading(false);
      setPaymentLoadingMessage('');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      // Get cancellation details
      const response = await authFetch('/api/cancel-subscription');
      if (!response.ok) throw new Error('Failed to get cancellation details');
      
      const data = await response.json();
      console.log('Cancel modal - Received data:', data);
      console.log('Cancel modal - Refund calculation:', data.data?.refundCalculation || data.refundCalculation);
      
      // Handle both response structures (with and without success wrapper)
      const refundCalculation = data.data?.refundCalculation || data.refundCalculation;
      setRefundInfo(refundCalculation);
      setCancelModalOpen(true);
    } catch (error: any) {
      console.error('Cancel request error:', error);
      openStatusModal('Unable to Load Cancellation Details', toUserFriendlyToastError(error), 'error');
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    try {
      setProcessing(true);
      
      const response = await authFetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) throw new Error('Failed to cancel subscription');
      
      const result = await response.json();
      
      // Close modal first
      setCancelModalOpen(false);
      
      // Show success message based on cancellation type
      const isTrial = data?.subscription?.status === 'trial';
      
      if (isTrial) {
        openStatusModal('Trial Cancelled', result.message, 'success');
      } else if (result.refundCalculation && result.refundCalculation.netRefund > 0) {
        openStatusModal(
          'Cancellation Confirmed',
          `Your subscription has been cancelled.\n\n` +
            `REFUND DETAILS:\n` +
            `• Total Paid: ₹${result.refundCalculation.totalPaid?.toLocaleString()}\n` +
            `• Days Used: ${result.refundCalculation.daysUsed} of ${result.refundCalculation.daysUsed + result.refundCalculation.daysRemaining}\n` +
            `• Net Refund: ₹${result.refundCalculation.netRefund?.toLocaleString()}\n\n` +
            `⏱️ Processing Time: ${result.estimatedProcessingTime || '3-5 business days'}\n` +
            `📧 You'll receive an email confirmation once the refund is processed.\n\n` +
            `Cancellation ID: ${result.cancellationId}`,
          'success'
        );
      } else {
        openStatusModal('Cancellation Updated', result.message, 'info');
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('Cancel confirmation error:', error);
      openStatusModal(
        'Cancellation Failed',
        toUserFriendlyToastError(error),
        'error'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgradeModalClose = () => {
    setUpgradeModalOpen(false);
  };

  const handleCancelModalClose = () => {
    setCancelModalOpen(false);
    setRefundInfo(null);
  };

  useEffect(() => {
    if (desktopIntentHandled || loading) return;

    // Allow intent handling for either Clerk-authenticated sessions or desktop token bridge sessions.
    if (!isDesktopBridge && (!clerkLoaded || !user)) return;

    const source = (searchParams.get('source') || '').toLowerCase();
    const intent = (searchParams.get('intent') || '').toLowerCase();

    // Only auto-open profile actions for desktop-origin links.
    if (source !== 'desktop_app') return;

    setDesktopIntentHandled(true);
    setActiveTab(0);

    if (intent === 'renew') {
      setRenewModalOpen(true);
    } else if (intent === 'update') {
      setUpgradeModalOpen(true);
    } else if (intent === 'cancel') {
      void handleCancelRequest();
    }

    // Remove one-time intent params so refresh does not reopen dialogs.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('source');
      url.searchParams.delete('intent');
      url.searchParams.delete('desktopToken');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [desktopIntentHandled, clerkLoaded, user, loading, searchParams, isDesktopBridge]);

  const handleRenew = async (plan: string, billingPeriod: 'monthly' | 'annually' = 'monthly') => {
    try {
      const currentPlan = data?.subscription?.plan;
      const selectedPlan = plan || currentPlan;
      if (!selectedPlan) {
        throw new Error('No active subscription found');
      }
      const capitalizedSelectedPlan = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1);
      setRenewModalOpen(false);
      router.push(`/checkout?plan=${encodeURIComponent(capitalizedSelectedPlan)}&billingPeriod=${billingPeriod}&context=renewal`);
      
    } catch (error: any) {
      console.error('[Renewal] Error:', error);
      openStatusModal(
        'Renewal Failed',
        `${toUserFriendlyToastError(error)}\n\nPlease try again or contact support if the issue persists.`,
        'error'
      );
    } finally {
      setProcessing(false);
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

  const getRenewalCheckoutHref = () => {
    const currentPlan = data?.subscription?.plan || 'Pro';
    const normalizedPlan = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1).toLowerCase();
    const currentBillingPeriod = data?.subscription?.billingPeriod === 'annually' ? 'annually' : 'monthly';
    return `/checkout?plan=${encodeURIComponent(normalizedPlan)}&billingPeriod=${currentBillingPeriod}&context=renewal`;
  };

  // Badge component
  const Badge = ({ text, color }: { text: string; color: string }) => (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${color}`}>
      {text}
    </span>
  );

  if (loading || !clerkLoaded) return (
    <div className="min-h-screen pt-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton type="profile" count={4} />
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen pt-20 bg-slate-50">
      <div className="max-w-md mx-auto px-4 flex justify-center items-center min-h-[60vh]">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Unable to load profile</h3>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );

  // Show subscription prompt for non-subscribed users
  if (data && !data.isSubscribed) {
    // Check if user has a cancelled subscription
    const isCancelled = data.subscription?.status === 'cancelled';
    
    if (isCancelled) {
      // Show cancellation status and details
      return (
        <div className="min-h-screen pt-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 font-display mb-4">
                Your Profile
              </h1>
              <p className="text-lg text-slate-600">Subscription Cancelled</p>
            </div>

            {/* Cancellation Status Card */}
            <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-sm mb-8">
              {/* Icon */}
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircleIcon className="w-8 h-8 text-white" />
              </div>

              {/* Status */}
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 text-center">
                Subscription Cancelled
              </h2>
              
              {/* Cancellation Details */}
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Plan</p>
                      <p className="font-semibold text-slate-900">
                        {(data.subscription?.plan ? data.subscription.plan.charAt(0).toUpperCase() + data.subscription.plan.slice(1) : 'Basic')} - {data.subscription?.billingPeriod === 'annually' ? 'Annual' : 'Monthly'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Cancelled On</p>
                      <p className="font-semibold text-slate-900">
                        {data.subscription?.cancelledDate ? new Date(data.subscription.cancelledDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {data.subscription?.cancellationReason && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-600 mb-1">Reason</p>
                      <p className="text-slate-900">{data.subscription?.cancellationReason}</p>
                    </div>
                  )}
                </div>

                {/* Refund Status */}
                {data.cancellation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <CurrencyDollarIcon className="w-5 h-5" />
                      Refund Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-800">Total Paid:</span>
                        <span className="font-semibold text-blue-900">₹{data.cancellation.totalPaid?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-800">Days Used:</span>
                        <span className="font-semibold text-blue-900">{data.cancellation.daysUsed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-800">Refund Amount:</span>
                        <span className="font-semibold text-blue-900">₹{data.cancellation.refundAmount?.toLocaleString()}</span>
                      </div>
                      <div className="pt-3 border-t border-blue-200 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-800">Status:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            data.cancellation.refundStatus === 'refunded'
                              ? 'bg-green-100 text-green-800'
                              : data.cancellation.refundStatus === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {data.cancellation.refundStatus === 'refunded' 
                              ? '✓ Refunded' 
                              : data.cancellation.refundStatus === 'processing'
                              ? '⏳ Processing'
                              : '📋 Pending Review'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {data.cancellation.refundStatus === 'pending_review' && (
                      <p className="text-xs text-blue-700 mt-4">
                        Your refund is being reviewed by our team. Processing typically takes 3-5 business days.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Call to Action */}
              <div className="mt-8 text-center space-y-4">
                <p className="text-slate-600">
                  Want to come back? Reactivate your subscription anytime.
                </p>
                <Link href="/subscribe">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center justify-center gap-2">
                    Reactivate Subscription
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Your account information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-slate-600">Username:</span>
                  <span className="text-slate-900 font-medium ml-2">{data.user.username || 'Not set'}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-slate-600">Email:</span>
                  <span className="text-slate-900 font-medium ml-2">{data.user.email || 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Show subscription required for users who never subscribed
    return (
      <div className="min-h-screen pt-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 font-display mb-4">
              Welcome, {user?.firstName}
            </h1>
            <p className="text-lg text-slate-600">Choose a plan to unlock the full LoanPro experience.</p>
          </div>

          {/* Subscription Required Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCardIcon className="w-8 h-8 text-white" />
            </div>

            {/* Content */}
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Subscription required
            </h2>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              To access your complete profile, analytics, device management, and all advanced features, 
              you need an active subscription plan. Choose from our flexible plans designed for your business needs.
            </p>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <ChartBarIcon className="w-6 h-6 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-2">Analytics dashboard</h3>
                <p className="text-sm text-slate-600">Track loan performance and collections.</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <ComputerDesktopIcon className="w-6 h-6 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-2">Device management</h3>
                <p className="text-sm text-slate-600">Manage connected devices securely.</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <ShieldCheckIcon className="w-6 h-6 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-2">Advanced access</h3>
                <p className="text-sm text-slate-600">Android photo verification and secure tokens.</p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="space-y-4">
              <Link href="/subscribe">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center justify-center gap-2 mx-auto">
                  Choose your plan
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
              </Link>
              
              <p className="text-sm text-slate-500">
                1-month free trial available - no credit card required
              </p>
            </div>

            {/* Basic User Info */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Your account information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-slate-600">Username:</span>
                  <span className="text-slate-900 font-medium ml-2">{data.user.username || 'Not set'}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-slate-600">Email:</span>
                  <span className="text-slate-900 font-medium ml-2">{data.user.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main return for subscribed users
  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      
      <div className="min-h-screen pt-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 font-display mb-4">
              Welcome back, {user?.firstName}
            </h1>
            <p className="text-lg text-slate-600">Manage your account, analytics, and device setup.</p>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2 mb-8 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab, idx) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.label}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      activeTab === idx 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        data?.subscription?.status === 'active' 
                          ? 'bg-green-500' 
                          : 'bg-slate-400'
                      }`}>
                        <CreditCardIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Your plan</h2>
                        <p className="text-slate-600 text-sm">Subscription status and details</p>
                      </div>
                    </div>
                    {data?.subscription && (
                      <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                        data.subscription.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : data.subscription.status === 'trial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {data.subscription.status === 'active' ? 'Active' : data.subscription.status === 'trial' ? 'Trial' : 'Expired'}
                      </div>
                    )}                  </div>
                  
                  {/* Trial Status Banner */}
                  {data?.subscription?.status === 'trial' && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <SparklesIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900 mb-1">1-Month Pro Trial Active</p>
                          <p className="text-sm text-blue-800">
                            You're enjoying full Pro features. Upgrade anytime to continue after your trial ends on{' '}
                            {data.subscription.endDate ? new Date(data.subscription.endDate).toLocaleDateString() : 'trial end date'}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Plan Name & Period */}
                  <div className="mb-6">
                    <div className="text-2xl font-semibold text-slate-900 mb-2">
                      {data?.subscription ? (data.subscription.plan.charAt(0).toUpperCase() + data.subscription.plan.slice(1) + ' Plan') : 'No Plan'}
                    </div>
                    {data?.subscription?.billingPeriod && (
                      <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                        {data.subscription.billingPeriod === 'annually' ? 'Billed annually (save 15%)' : 'Billed monthly'}
                      </div>
                    )}
                  </div>
                  
                  {/* Key Dates Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Started</div>
                      <div className="text-sm font-semibold text-slate-900">
                        {data?.subscription?.startDate ? new Date(data.subscription.startDate).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <div className={`${isExpired() ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4`}>
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                        {data?.subscription?.status === 'trial' ? 'Trial Ends' : 'Renews'}
                      </div>
                      <div className={`text-sm font-semibold ${isExpired() ? 'text-red-700' : 'text-slate-900'}`}>
                        {data?.subscription?.endDate && data.subscription.endDate !== 'Invalid Date' 
                          ? new Date(data.subscription.endDate).toLocaleDateString() 
                          : '-'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Renewal Countdown */}
                  {data?.subscription?.endDate && data.subscription.endDate !== 'Invalid Date' && !needsRenewal() && (
                    <div className="bg-white/40 rounded-xl p-4 mb-6 border border-white/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 font-semibold mb-1">Time Remaining</p>
                          <p className="text-lg font-bold text-gray-900">
                            {(() => {
                              const now = new Date();
                              const endDate = new Date(data.subscription.endDate);
                              const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              return daysLeft > 0 ? `${daysLeft} days` : 'Expiring today';
                            })()}
                          </p>
                        </div>
                        <div className="text-3xl">⏱️</div>
                      </div>
                    </div>
                  )}
                    
                    {/* Renewal Alert */}
                    {needsRenewal() && (
                      <div className={`${isExpired() ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border rounded-xl p-4 mb-6`}>
                        <div className="flex items-start gap-3">
                          <ExclamationTriangleIcon className={`w-6 h-6 flex-shrink-0 ${isExpired() ? 'text-red-600' : 'text-yellow-600'} mt-0.5`} />
                          <div>
                            <h4 className={`font-semibold text-sm ${isExpired() ? 'text-red-900' : 'text-yellow-900'}`}>
                              {isExpired() ? 'Subscription expired' : 'Expiring soon'}
                            </h4>
                            <p className={`text-xs ${isExpired() ? 'text-red-700' : 'text-yellow-700'} mt-1`}>
                              {isExpired() 
                                ? 'Your subscription has expired. Renew now to restore full access.'
                                : `Your subscription expires on ${new Date(data?.subscription?.endDate || '').toLocaleDateString()}. Renew soon.`
                              }
                            </p>
                            <Link
                              href={getRenewalCheckoutHref()}
                              className={`mt-3 inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                isExpired()
                                  ? 'bg-red-700 text-white hover:bg-red-800'
                                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
                              }`}
                            >
                              Renew in secure checkout
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Show Renew button if subscription needs renewal */}
                      {needsRenewal() ? (
                        <>
                          <button 
                            onClick={() => router.push(getRenewalCheckoutHref())}
                            disabled={processing}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? 'Processing...' : 'Renew Now'}
                          </button>
                          <button 
                            onClick={() => setUpgradeModalOpen(true)}
                            disabled={processing}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? 'Processing...' : 'Change Plan Instead'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => setUpgradeModalOpen(true)}
                            disabled={processing}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? 'Processing...' : 'Upgrade Plan'}
                          </button>
                          <button 
                            onClick={handleCancelRequest}
                            disabled={processing}
                            className="bg-white hover:bg-red-50 text-red-600 font-semibold py-2.5 px-5 rounded-lg border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? 'Processing...' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => setActiveTab(2)}
                            className="flex-1 bg-white text-blue-700 font-semibold py-2.5 px-5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                          >
                            Manage Devices
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                {/* Access Token Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                        <KeyIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Access Token</h2>
                        <p className="text-slate-600 text-sm">For desktop app authentication</p>
                      </div>
                    </div>
                  </div>

                  {/* Token Display */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <code className="flex-1 font-mono text-sm text-slate-900 break-all">
                        {showAccessToken ? (data?.user?.accessToken || 'No token available') : '••••••••••••••••••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => setShowAccessToken(!showAccessToken)}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
                        title={showAccessToken ? 'Hide token' : 'Show token'}
                      >
                        {showAccessToken ? (
                          <EyeSlashIcon className="h-5 w-5 text-slate-600" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-slate-600" />
                        )}
                      </button>
                      <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5 text-slate-600" />
                      </button>
                    </div>
                    {copied && (
                      <p className="text-xs text-green-600 font-semibold mt-2">✓ Copied to clipboard!</p>
                    )}
                  </div>

                  {/* Warning Box */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <ShieldCheckIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-900">
                        <span className="font-semibold">Keep this secure:</span> Anyone with this token can access your account from the desktop app.
                      </p>
                    </div>
                  </div>

                  {/* How to Use */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <ShieldCheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-blue-900 mb-2">How to use this token:</p>
                        <ol className="list-decimal ml-4 space-y-1.5 text-sm text-blue-800">
                          <li>Download the desktop app from the <Link href="/download" className="underline font-semibold">Download page</Link></li>
                          <li>Open the app and click "Log in with Access Token"</li>
                          <li>Paste this token and click "Authenticate"</li>
                          <li>Your device will be automatically bound to your account</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Payment History</h2>
                {data?.paymentHistory && data.paymentHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    {(() => {
                      const pageSize = 5;
                      const totalPages = Math.max(1, Math.ceil(data.paymentHistory.length / pageSize));
                      const safePage = Math.min(paymentHistoryPage, totalPages);
                      const startIndex = (safePage - 1) * pageSize;
                      const pagedHistory = data.paymentHistory.slice(startIndex, startIndex + pageSize);

                      return (
                        <>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Type</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Plan</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedHistory.map((payment: PaymentHistoryEntry, index: number) => {
                          const status = getTransactionStatus(payment);
                          return (
                          <tr key={payment.id || index} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-900">
                              {new Date(payment.date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                              {getTransactionLabel(payment)}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-700">
                              {payment.plan?.charAt(0).toUpperCase() + payment.plan?.slice(1) || 'N/A'}
                              {payment.billingPeriod ? (
                                <span className="text-xs text-slate-500 ml-2">
                                  {payment.billingPeriod === 'annually' ? 'Annual' : 'Monthly'}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-3 px-4 text-right text-sm font-semibold">
                              <span className={payment.amount < 0 ? 'text-red-600' : 'text-slate-900'}>
                                {payment.amount < 0 ? '-' : ''}₹{Math.abs(payment.amount || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {payment.receiptUrl ? (
                                <a 
                                  href={payment.receiptUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                                >
                                  View
                                </a>
                              ) : (
                                <span className="text-slate-400 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-xs text-slate-500">
                        Showing {startIndex + 1}-{Math.min(startIndex + pageSize, data.paymentHistory.length)} of {data.paymentHistory.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPaymentHistoryPage(Math.max(1, safePage - 1))}
                          disabled={safePage <= 1}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-slate-500">Page {safePage} of {totalPages}</span>
                        <button
                          onClick={() => setPaymentHistoryPage(Math.min(totalPages, safePage + 1))}
                          disabled={safePage >= totalPages}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-slate-600 text-center py-8">No payment history available</p>
                )}
              </div>
            </>
          )}

          {/* Devices Tab */}
          {activeTab === 1 && (
            <div>
              <DeviceManagement />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 2 && (
            <div className="mt-4 pb-12">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row gap-8">
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
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {upgradeModalOpen && data?.subscription && (
        <UpgradeModal 
          isOpen={upgradeModalOpen} 
          onClose={handleUpgradeModalClose} 
          currentPlan={data.subscription.plan || 'basic'} 
          currentBillingPeriod={data.subscription.billingPeriod || 'monthly'}
          onUpgrade={handleUpgrade} 
        />
      )}
      {renewModalOpen && data?.subscription && (
        <RenewModal 
          isOpen={renewModalOpen} 
          onClose={handleRenewModalClose} 
          currentPlan={data.subscription.plan || 'basic'} 
          currentBillingPeriod={data.subscription.billingPeriod || 'monthly'}
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
      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={closeStatusModal}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />
      
      {/* Payment Loading Overlay */}
      {paymentLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-3 border-4 border-purple-200 rounded-full"></div>
              <div className="absolute inset-3 border-4 border-purple-600 rounded-full border-t-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{paymentLoadingMessage || 'Processing...'}</h3>
            <p className="text-gray-600 text-sm">Please wait, do not close this window</p>
            {paymentLoadingMessage.includes('Success') && (
              <div className="mt-4 text-green-600 flex items-center justify-center gap-2">
                <CheckIcon className="w-6 h-6" />
                <span className="font-semibold">Payment Completed!</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePage;