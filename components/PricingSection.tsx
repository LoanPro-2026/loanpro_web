import { connectToDatabase } from '@/lib/mongodb';
import { getEffectivePlanPricing } from '@/lib/planConfig';
import PricingSectionClient from './PricingSectionClient';

const plans = [
  {
    name: 'Basic',
    price: '₹599',
    period: '/month',
    description: 'Core loan operations for individual lenders and small shops',
    deviceLimit: 1,
    storage: 'Local only',
    features: [
      'Core loan tracking and collections',
      'Unlimited active records',
      'Local data storage',
      'Basic analytics dashboard',
      'Standard reports',
      'Email support',
    ],
    popular: false,
    tone: 'border-slate-200'
  },
  {
    name: 'Pro',
    price: '₹899',
    period: '/month',
    description: 'For growing operations that need sync and backup reliability',
    deviceLimit: 1,
    storage: 'Cloud backup (up to 15GB)',
    features: [
      'Everything in Basic',
      'Unlimited active records',
      'Google Drive Cloud Backup',
      'Mobile sync support',
      'Android photo capture workflow',
      'Daily cloud sync',
      'Priority support',
      'Faster feature request queue'
    ],
    popular: true,
    tone: 'border-blue-600'
  },
  {
    name: 'Enterprise',
    price: '₹1,399',
    period: '/month',
    description: 'Pro capabilities with controlled multi-device access',
    deviceLimit: 2,
    storage: 'Cloud backup (up to 15GB)',
    features: [
      'Everything in Pro',
      '2 app devices on same access token',
      'Unlimited active records',
      'Enterprise onboarding priority',
      'Priority issue handling',
      ],
    popular: false,
    tone: 'border-slate-200'
  }
];

const PricingSection = async () => {
  let livePricing: Record<string, number> = {};

  try {
    const { db } = await connectToDatabase();
    livePricing = await getEffectivePlanPricing(db);
  } catch {
    livePricing = {};
  }

  const displayPlans = plans.map((plan) => ({
    name: plan.name,
    monthlyPrice: Number(livePricing[plan.name] || Number(String(plan.price).replace(/[^\d]/g, ''))),
    description: plan.description,
    deviceLimit: plan.deviceLimit,
    storage: plan.storage,
    features: plan.features,
    popular: plan.popular,
    tone: plan.tone,
  }));

  return <PricingSectionClient plans={displayPlans} />;
};

export default PricingSection; 