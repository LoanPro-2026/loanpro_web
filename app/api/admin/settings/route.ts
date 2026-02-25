import { NextRequest, NextResponse } from 'next/server';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { writeAdminAuditLog } from '@/lib/adminAudit';
import { getAdminCachedResponse, invalidateAdminCacheByTags, setAdminCachedResponse } from '@/lib/adminResponseCache';

const DEFAULT_SETTINGS = {
  trialDays: 30,
  maintenanceMode: false,
  allowNewSignups: true,
  supportEmail: 'support@loanpro.tech',
  alertsEnabled: true,
};

export async function GET(request: NextRequest) {
  try {
    await enforceAdminAccess(request, {
      permission: 'settings:read',
      rateLimitKey: 'settings:get',
      limit: 60,
      windowMs: 60_000,
    });
    const cacheKey = 'admin:settings:get:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const { db } = await connectToDatabase();

    const settings = await db.collection('admin_settings').findOne({ key: 'global' });

    const payload = {
      success: true,
      settings: settings?.value || DEFAULT_SETTINGS,
      updatedAt: settings?.updatedAt || null,
    };

    setAdminCachedResponse(cacheKey, payload, 30_000, ['settings']);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch settings' },
      { status: getAdminErrorStatus(error) }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'settings:write',
      rateLimitKey: 'settings:patch',
      limit: 20,
      windowMs: 60_000,
    });
    const body = await request.json();

    const allowedKeys = ['trialDays', 'maintenanceMode', 'allowNewSignups', 'supportEmail', 'alertsEnabled'];
    const extraKeys = Object.keys(body || {}).filter((key) => !allowedKeys.includes(key));
    if (extraKeys.length > 0) {
      return NextResponse.json({ success: false, error: `Unsupported fields: ${extraKeys.join(', ')}` }, { status: 400 });
    }

    const nextSettings = {
      trialDays: Number(body?.trialDays ?? DEFAULT_SETTINGS.trialDays),
      maintenanceMode: Boolean(body?.maintenanceMode ?? DEFAULT_SETTINGS.maintenanceMode),
      allowNewSignups: Boolean(body?.allowNewSignups ?? DEFAULT_SETTINGS.allowNewSignups),
      supportEmail: String(body?.supportEmail || DEFAULT_SETTINGS.supportEmail).trim(),
      alertsEnabled: Boolean(body?.alertsEnabled ?? DEFAULT_SETTINGS.alertsEnabled),
    };

    if (!Number.isInteger(nextSettings.trialDays) || nextSettings.trialDays < 0 || nextSettings.trialDays > 365) {
      return NextResponse.json({ success: false, error: 'trialDays must be between 0 and 365' }, { status: 400 });
    }

    if (!nextSettings.supportEmail || !nextSettings.supportEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid supportEmail is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    await db.collection('admin_settings').updateOne(
      { key: 'global' },
      {
        $set: {
          key: 'global',
          value: nextSettings,
          updatedAt: now,
          updatedBy: admin.email,
        },
      },
      { upsert: true }
    );

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'settings.update',
      targetType: 'settings',
      targetId: 'global',
      details: nextSettings,
    });

    invalidateAdminCacheByTags(['settings', 'dashboard']);

    return NextResponse.json({ success: true, settings: nextSettings, updatedAt: now });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
