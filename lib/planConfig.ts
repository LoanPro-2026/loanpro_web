import { Db } from 'mongodb';
import { PLAN_FEATURES, type PlanFeatures } from '@/lib/planFeatures';

export type PlanName = 'Basic' | 'Pro' | 'Enterprise' | 'trial';

export const DEFAULT_PLAN_PRICING: Record<Exclude<PlanName, 'trial'>, number> = {
  Basic: 599,
  Pro: 899,
  Enterprise: 1399,
};

export const MANAGED_PLANS: PlanName[] = ['Basic', 'Pro', 'Enterprise', 'trial'];

export function normalizePlanName(input: unknown): PlanName {
  const value = String(input || '').trim().toLowerCase();
  if (value === 'pro') return 'Pro';
  if (value === 'enterprise') return 'Enterprise';
  if (value === 'trial') return 'trial';
  return 'Basic';
}

function deepMergeFeatures(base: PlanFeatures, override?: Partial<PlanFeatures>): PlanFeatures {
  if (!override) return base;

  return {
    maxDevices:
      typeof override.maxDevices === 'number' && Number.isFinite(override.maxDevices)
        ? Math.max(0, Math.floor(override.maxDevices))
        : base.maxDevices,
    cloudStorageGB:
      typeof override.cloudStorageGB === 'number' && Number.isFinite(override.cloudStorageGB)
        ? override.cloudStorageGB
        : base.cloudStorageGB,
    features: {
      ...base.features,
      ...(override.features || {}),
    },
  };
}

export async function getPlanConfig(db: Db) {
  const [pricingDoc, featuresDoc] = await Promise.all([
    db.collection('pricing_config').findOne({ configName: 'current_pricing' }),
    db.collection('plan_features_config').findOne({ configName: 'current_plan_features' }),
  ]);

  const pricing = {
    Basic:
      typeof pricingDoc?.prices?.Basic === 'number' && pricingDoc.prices.Basic > 0
        ? pricingDoc.prices.Basic
        : DEFAULT_PLAN_PRICING.Basic,
    Pro:
      typeof pricingDoc?.prices?.Pro === 'number' && pricingDoc.prices.Pro > 0
        ? pricingDoc.prices.Pro
        : DEFAULT_PLAN_PRICING.Pro,
    Enterprise:
      typeof pricingDoc?.prices?.Enterprise === 'number' && pricingDoc.prices.Enterprise > 0
        ? pricingDoc.prices.Enterprise
        : DEFAULT_PLAN_PRICING.Enterprise,
  };

  const featureOverrides: Partial<Record<PlanName, Partial<PlanFeatures>>> =
    featuresDoc?.plans && typeof featuresDoc.plans === 'object' ? featuresDoc.plans : {};

  const plans: Record<PlanName, PlanFeatures> = {
    Basic: deepMergeFeatures(PLAN_FEATURES.Basic, featureOverrides.Basic),
    Pro: deepMergeFeatures(PLAN_FEATURES.Pro, featureOverrides.Pro),
    Enterprise: deepMergeFeatures(PLAN_FEATURES.Enterprise, featureOverrides.Enterprise),
    trial: deepMergeFeatures(PLAN_FEATURES.trial, featureOverrides.trial),
  };

  return {
    pricing,
    plans,
    meta: {
      pricingUpdatedAt: pricingDoc?.updatedAt || null,
      pricingUpdatedBy: pricingDoc?.updatedBy || null,
      featuresUpdatedAt: featuresDoc?.updatedAt || null,
      featuresUpdatedBy: featuresDoc?.updatedBy || null,
    },
  };
}

export async function getEffectivePlanFeatures(db: Db, inputPlan: string): Promise<PlanFeatures> {
  const planName = normalizePlanName(inputPlan);
  const config = await getPlanConfig(db);
  return config.plans[planName];
}

export async function getEffectivePlanPricing(db: Db) {
  const config = await getPlanConfig(db);
  return config.pricing;
}
