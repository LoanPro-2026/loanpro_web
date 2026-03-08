/**
 * Plan Features Configuration
 * Single source of truth for all plan features and limits
 */

export interface PlanFeatures {
  maxDevices: number;
  cloudStorageGB: number; // -1 for unlimited
  features: {
    biometrics: boolean;
    autoSync: boolean;
    cloudDatabase: boolean;
    mobileSync: boolean;
    cloudBackup: boolean;
    analytics: boolean;
    prioritySupport: boolean;
    customSubdomain: boolean;
    apiAccess: boolean;
    whiteLabel?: boolean;
    dedicatedSupport?: boolean;
  };
}

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  Basic: {
    maxDevices: 1,
    cloudStorageGB: 0,
    features: {
      biometrics: false,
      autoSync: false,
      cloudDatabase: false,
      mobileSync: false,
      cloudBackup: false,
      analytics: true,
      prioritySupport: false,
      customSubdomain: false,
      apiAccess: false,
    },
  },
  Pro: {
    maxDevices: 1,
    cloudStorageGB: 15,
    features: {
      biometrics: false,
      autoSync: true,
      cloudDatabase: true,
      mobileSync: true,
      cloudBackup: true,
      analytics: true,
      prioritySupport: true,
      customSubdomain: true,
      apiAccess: true,
    },
  },
  Enterprise: {
    maxDevices: 2,
    cloudStorageGB: 15,
    features: {
      biometrics: false,
      autoSync: true,
      cloudDatabase: true,
      mobileSync: true,
      cloudBackup: true,
      analytics: true,
      prioritySupport: true,
      customSubdomain: true,
      apiAccess: true,
    },
  },
  trial: {
    maxDevices: 1,
    cloudStorageGB: 15,
    features: {
      biometrics: true,
      autoSync: true,
      cloudDatabase: true,
      mobileSync: true,
      cloudBackup: true,
      analytics: true,
      prioritySupport: true,
      customSubdomain: true,
      apiAccess: true,
    },
  },
};

/**
 * Get features and limits for a specific plan
 */
export function getPlanFeatures(plan: string): PlanFeatures {
  const normalizedPlan = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
  return PLAN_FEATURES[normalizedPlan] || PLAN_FEATURES.Basic;
}

/**
 * Get cloud storage limit in bytes
 */
export function getCloudStorageBytes(plan: string): number {
  const features = getPlanFeatures(plan);
  if (features.cloudStorageGB === -1) return -1; // unlimited
  return features.cloudStorageGB * 1024 * 1024 * 1024;
}

/**
 * Format cloud storage for display
 */
export function formatCloudStorage(plan: string): string {
  const features = getPlanFeatures(plan);
  if (features.cloudStorageGB === -1) return 'Unlimited';
  if (features.cloudStorageGB === 0) return 'None';
  return `${features.cloudStorageGB}GB`;
}
