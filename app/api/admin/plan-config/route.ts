import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, invalidateAdminCacheByTags, setAdminCachedResponse } from '@/lib/adminResponseCache';
import { writeAdminAuditLog } from '@/lib/adminAudit';
import { getPlanConfig, MANAGED_PLANS, normalizePlanName, type PlanName } from '@/lib/planConfig';
import { PLAN_FEATURES, type PlanFeatures } from '@/lib/planFeatures';

function normalizePricingValue(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function normalizeNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function sanitizePlanOverride(input: unknown): Partial<PlanFeatures> | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const out: Partial<PlanFeatures> = {};

  if (raw.maxDevices !== undefined) {
    const maxDevices = normalizeNumber(raw.maxDevices);
    if (maxDevices === null || maxDevices < 0) return null;
    out.maxDevices = Math.floor(maxDevices);
  }

  if (raw.cloudStorageGB !== undefined) {
    const cloudStorageGB = normalizeNumber(raw.cloudStorageGB);
    if (cloudStorageGB === null) return null;
    out.cloudStorageGB = cloudStorageGB;
  }

  // Active records are unlimited across all plans and cannot be overridden.

  if (raw.features !== undefined) {
    if (!raw.features || typeof raw.features !== 'object') return null;
    const featureEntries = Object.entries(raw.features as Record<string, unknown>);
    const sanitizedFeatures: Record<string, boolean> = {};

    for (const [key, value] of featureEntries) {
      if (typeof value !== 'boolean') return null;
      sanitizedFeatures[key] = value;
    }

    out.features = sanitizedFeatures as PlanFeatures['features'];
  }

  return out;
}

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'settings:read',
      rateLimitKey: 'plan-config:get',
      limit: 80,
      windowMs: 60_000,
    });

    const cacheKey = 'admin:plan-config:get:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const { db } = await connectToDatabase();
    const config = await getPlanConfig(db);

    const payload = {
      success: true,
      pricing: config.pricing,
      plans: config.plans,
      defaults: PLAN_FEATURES,
      meta: config.meta,
    };

    setAdminCachedResponse(cacheKey, payload, 25_000, ['settings', 'dashboard']);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch plan configuration' },
      { status: getAdminErrorStatus(error) }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'settings:write',
      rateLimitKey: 'plan-config:patch',
      limit: 25,
      windowMs: 60_000,
    });

    const body = await request.json();
    const pricingInput = body?.pricing;
    const plansInput = body?.plans;

    if ((pricingInput === undefined || pricingInput === null) && (plansInput === undefined || plansInput === null)) {
      return NextResponse.json({ success: false, error: 'No plan configuration payload provided' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    const pricingPatch: Record<string, number> = {};
    if (pricingInput !== undefined) {
      if (!pricingInput || typeof pricingInput !== 'object') {
        return NextResponse.json({ success: false, error: 'pricing must be an object' }, { status: 400 });
      }

      for (const plan of ['Basic', 'Pro', 'Enterprise'] as const) {
        if ((pricingInput as Record<string, unknown>)[plan] !== undefined) {
          const value = normalizePricingValue((pricingInput as Record<string, unknown>)[plan]);
          if (value === null) {
            return NextResponse.json({ success: false, error: `Invalid pricing for ${plan}` }, { status: 400 });
          }
          pricingPatch[plan] = value;
        }
      }
    }

    const planFeaturePatch: Partial<Record<PlanName, Partial<PlanFeatures>>> = {};
    if (plansInput !== undefined) {
      if (!plansInput || typeof plansInput !== 'object') {
        return NextResponse.json({ success: false, error: 'plans must be an object' }, { status: 400 });
      }

      for (const [rawPlan, rawPlanPatch] of Object.entries(plansInput as Record<string, unknown>)) {
        const normalizedPlan = normalizePlanName(rawPlan);
        if (!MANAGED_PLANS.includes(normalizedPlan)) {
          return NextResponse.json({ success: false, error: `Unsupported plan: ${rawPlan}` }, { status: 400 });
        }

        const sanitized = sanitizePlanOverride(rawPlanPatch);
        if (!sanitized) {
          return NextResponse.json(
            { success: false, error: `Invalid feature configuration for plan ${rawPlan}` },
            { status: 400 }
          );
        }

        planFeaturePatch[normalizedPlan] = sanitized;
      }
    }

    if (Object.keys(pricingPatch).length > 0) {
      await db.collection('pricing_config').updateOne(
        { configName: 'current_pricing' },
        {
          $set: {
            configName: 'current_pricing',
            ...Object.fromEntries(Object.entries(pricingPatch).map(([plan, value]) => [`prices.${plan}`, value])),
            updatedAt: now,
            updatedBy: admin.email,
          },
        },
        { upsert: true }
      );
    }

    if (Object.keys(planFeaturePatch).length > 0) {
      await db.collection('plan_features_config').updateOne(
        { configName: 'current_plan_features' },
        {
          $set: {
            configName: 'current_plan_features',
            ...Object.fromEntries(
              Object.entries(planFeaturePatch).map(([plan, patch]) => [`plans.${plan}`, patch])
            ),
            updatedAt: now,
            updatedBy: admin.email,
          },
        },
        { upsert: true }
      );
    }

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'plans.config.update',
      targetType: 'settings',
      targetId: 'plan_config',
      details: {
        pricingUpdated: Object.keys(pricingPatch),
        plansUpdated: Object.keys(planFeaturePatch),
      },
    });

    invalidateAdminCacheByTags(['settings', 'dashboard', 'subscriptions', 'users']);

    const updated = await getPlanConfig(db);

    return NextResponse.json({
      success: true,
      pricing: updated.pricing,
      plans: updated.plans,
      meta: updated.meta,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update plan configuration' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
