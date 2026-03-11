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

const DEFAULT_MONITORING_SETTINGS = {
  limits: {
    mongodbStorageGb: 10,
    vercelRequestsMonthly: 1_000_000,
    cloudRunRequestsMonthly: 1_000_000,
    clerkMauMonthly: 10_000,
    brevoEmailsMonthly: 9_000,
    backendApiEventsMonthly: 500_000,
  },
  providers: {
    vercel: {
      projectId: '',
      teamId: '',
      hasApiToken: false,
    },
    cloudRun: {
      projectId: '',
      region: '',
      serviceName: '',
      hasServiceAccountJson: false,
    },
    clerk: {
      hasSecretKey: false,
    },
    brevo: {
      hasApiKey: false,
    },
  },
};

function maskMonitoringSettings(raw: any) {
  if (!raw || typeof raw !== 'object') return DEFAULT_MONITORING_SETTINGS;

  return {
    limits: {
      mongodbStorageGb: parsePositiveNumber(raw?.limits?.mongodbStorageGb, DEFAULT_MONITORING_SETTINGS.limits.mongodbStorageGb),
      vercelRequestsMonthly: parsePositiveNumber(raw?.limits?.vercelRequestsMonthly, DEFAULT_MONITORING_SETTINGS.limits.vercelRequestsMonthly),
      cloudRunRequestsMonthly: parsePositiveNumber(raw?.limits?.cloudRunRequestsMonthly, DEFAULT_MONITORING_SETTINGS.limits.cloudRunRequestsMonthly),
      clerkMauMonthly: parsePositiveNumber(raw?.limits?.clerkMauMonthly, DEFAULT_MONITORING_SETTINGS.limits.clerkMauMonthly),
      brevoEmailsMonthly: parsePositiveNumber(raw?.limits?.brevoEmailsMonthly, DEFAULT_MONITORING_SETTINGS.limits.brevoEmailsMonthly),
      backendApiEventsMonthly: parsePositiveNumber(raw?.limits?.backendApiEventsMonthly, DEFAULT_MONITORING_SETTINGS.limits.backendApiEventsMonthly),
    },
    providers: {
      vercel: {
        projectId: String(raw?.providers?.vercel?.projectId || ''),
        teamId: String(raw?.providers?.vercel?.teamId || ''),
        hasApiToken: Boolean(raw?.providers?.vercel?.apiToken),
      },
      cloudRun: {
        projectId: String(raw?.providers?.cloudRun?.projectId || ''),
        region: String(raw?.providers?.cloudRun?.region || ''),
        serviceName: String(raw?.providers?.cloudRun?.serviceName || ''),
        hasServiceAccountJson: Boolean(raw?.providers?.cloudRun?.serviceAccountJson),
      },
      clerk: {
        hasSecretKey: Boolean(raw?.providers?.clerk?.secretKey),
      },
      brevo: {
        hasApiKey: Boolean(raw?.providers?.brevo?.apiKey),
      },
    },
  };
}

function parsePositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function resolveSecretInput(incomingValue: unknown, existingValue: string): string {
  if (incomingValue === undefined) return existingValue;
  if (incomingValue === null) return '';
  const next = String(incomingValue).trim();
  return next;
}

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

    const [settings, monitoring] = await Promise.all([
      db.collection('admin_settings').findOne({ key: 'global' }),
      db.collection('admin_settings').findOne({ key: 'monitoring' }),
    ]);

    const payload = {
      success: true,
      settings: settings?.value || DEFAULT_SETTINGS,
      monitoring: maskMonitoringSettings(monitoring?.value),
      updatedAt: settings?.updatedAt || null,
      monitoringUpdatedAt: monitoring?.updatedAt || null,
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

    const allowedKeys = ['trialDays', 'maintenanceMode', 'allowNewSignups', 'supportEmail', 'alertsEnabled', 'monitoring'];
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

    const incomingMonitoring = body?.monitoring;

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

    let sanitizedMonitoring = DEFAULT_MONITORING_SETTINGS;
    if (incomingMonitoring !== undefined) {
      const existingMonitoring = await db.collection('admin_settings').findOne({ key: 'monitoring' });
      const existing = existingMonitoring?.value || {};

      const limits = incomingMonitoring?.limits || {};
      const providers = incomingMonitoring?.providers || {};

      sanitizedMonitoring = {
        limits: {
          mongodbStorageGb: parsePositiveNumber(limits.mongodbStorageGb ?? existing?.limits?.mongodbStorageGb, DEFAULT_MONITORING_SETTINGS.limits.mongodbStorageGb),
          vercelRequestsMonthly: parsePositiveNumber(limits.vercelRequestsMonthly ?? existing?.limits?.vercelRequestsMonthly, DEFAULT_MONITORING_SETTINGS.limits.vercelRequestsMonthly),
          cloudRunRequestsMonthly: parsePositiveNumber(limits.cloudRunRequestsMonthly ?? existing?.limits?.cloudRunRequestsMonthly, DEFAULT_MONITORING_SETTINGS.limits.cloudRunRequestsMonthly),
          clerkMauMonthly: parsePositiveNumber(limits.clerkMauMonthly ?? existing?.limits?.clerkMauMonthly, DEFAULT_MONITORING_SETTINGS.limits.clerkMauMonthly),
          brevoEmailsMonthly: parsePositiveNumber(limits.brevoEmailsMonthly ?? existing?.limits?.brevoEmailsMonthly, DEFAULT_MONITORING_SETTINGS.limits.brevoEmailsMonthly),
          backendApiEventsMonthly: parsePositiveNumber(limits.backendApiEventsMonthly ?? existing?.limits?.backendApiEventsMonthly, DEFAULT_MONITORING_SETTINGS.limits.backendApiEventsMonthly),
        },
        providers: {
          vercel: {
            projectId: String(providers?.vercel?.projectId ?? existing?.providers?.vercel?.projectId ?? ''),
            teamId: String(providers?.vercel?.teamId ?? existing?.providers?.vercel?.teamId ?? ''),
            apiToken: resolveSecretInput(providers?.vercel?.apiToken, String(existing?.providers?.vercel?.apiToken || '')),
          },
          cloudRun: {
            projectId: String(providers?.cloudRun?.projectId ?? existing?.providers?.cloudRun?.projectId ?? ''),
            region: String(providers?.cloudRun?.region ?? existing?.providers?.cloudRun?.region ?? ''),
            serviceName: String(providers?.cloudRun?.serviceName ?? existing?.providers?.cloudRun?.serviceName ?? ''),
            serviceAccountJson: resolveSecretInput(
              providers?.cloudRun?.serviceAccountJson,
              String(existing?.providers?.cloudRun?.serviceAccountJson || '')
            ),
          },
          clerk: {
            secretKey: resolveSecretInput(providers?.clerk?.secretKey, String(existing?.providers?.clerk?.secretKey || '')),
          },
          brevo: {
            apiKey: resolveSecretInput(providers?.brevo?.apiKey, String(existing?.providers?.brevo?.apiKey || '')),
          },
        },
      };

      await db.collection('admin_settings').updateOne(
        { key: 'monitoring' },
        {
          $set: {
            key: 'monitoring',
            value: sanitizedMonitoring,
            updatedAt: now,
            updatedBy: admin.email,
          },
        },
        { upsert: true }
      );
    }

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'settings.update',
      targetType: 'settings',
      targetId: 'global',
      details: nextSettings,
    });

    if (incomingMonitoring !== undefined) {
      await writeAdminAuditLog({
        actorEmail: admin.email,
        action: 'settings.monitoring.update',
        targetType: 'settings',
        targetId: 'monitoring',
        details: {
          limits: sanitizedMonitoring.limits,
          providers: {
            vercel: {
              projectId: sanitizedMonitoring.providers.vercel.projectId,
              teamId: sanitizedMonitoring.providers.vercel.teamId,
              hasApiToken: Boolean(sanitizedMonitoring.providers.vercel.apiToken),
            },
            cloudRun: {
              projectId: sanitizedMonitoring.providers.cloudRun.projectId,
              region: sanitizedMonitoring.providers.cloudRun.region,
              serviceName: sanitizedMonitoring.providers.cloudRun.serviceName,
              hasServiceAccountJson: Boolean(sanitizedMonitoring.providers.cloudRun.serviceAccountJson),
            },
            clerk: { hasSecretKey: Boolean(sanitizedMonitoring.providers.clerk.secretKey) },
            brevo: { hasApiKey: Boolean(sanitizedMonitoring.providers.brevo.apiKey) },
          },
        },
      });
    }

    invalidateAdminCacheByTags(['settings', 'dashboard', 'analytics']);

    return NextResponse.json({
      success: true,
      settings: nextSettings,
      monitoring: incomingMonitoring !== undefined ? maskMonitoringSettings(sanitizedMonitoring) : undefined,
      updatedAt: now,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
