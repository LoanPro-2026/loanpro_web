import { connectToDatabase } from '@/lib/mongodb';
import { getEffectivePlanPricing } from '@/lib/planConfig';
import PricingSectionClient from './PricingSectionClient';

const plans = [
    {
        name: 'Basic',
        price: '₹599',
        period: '/month',
        description: 'Perfect for a single shop owner just starting out',
        deviceLimit: 1,
        storage: 'Local computer only',
        features: [
            'Track all daily loans and payments',
            'Add unlimited customer records',
            'Data stays safely on your computer',
            'Simple daily profit reports',
            'Print loan receipts',
            'Email support',
        ],
        popular: false,
        tone: 'border-slate-200'
    },
    {
        name: 'Pro',
        price: '₹899',
        period: '/month',
        description: 'For busy shops that need photo taking and safety backups',
        deviceLimit: 1,
        storage: 'Cloud backup included',
        features: [
            'Everything in Basic',
            'Take customer photos via mobile app',
            'Automatic Google Drive safety backups',
            'See your data on mobile',
            'Priority direct support',
            'Request new features directly'
        ],
        popular: true,
        tone: 'border-blue-600'
    },
    {
        name: 'Enterprise',
        price: '₹1,399',
        period: '/month',
        description: 'For larger teams that need more devices, branding, and dedicated support',
        deviceLimit: 5,
        storage: '100GB cloud storage included',
        features: [
            'Everything in Pro',
            'Install the app on up to 5 computers',
            'White-label and custom branding options',
            'Dedicated onboarding and support',
            'Higher storage and backup limits',
            'Priority help for setup',
        ],
        popular: false,
        tone: 'border-slate-200'
    }
];

const PricingSection = async () => {
    let livePricing: Record<string, number> = {};
        let salesPhone = '+91 78988 85129';
        let salesCallEnabled = true;

    try {
        const { db } = await connectToDatabase();
        livePricing = await getEffectivePlanPricing(db);

            const settings = await db.collection('admin_settings').findOne({ key: 'global' });
            salesPhone = String(settings?.value?.salesPhone || salesPhone);
            salesCallEnabled = Boolean(settings?.value?.salesCallEnabled ?? true);
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

    return <PricingSectionClient plans={displayPlans} salesPhone={salesPhone} salesCallEnabled={salesCallEnabled} />;
};

export default PricingSection; 