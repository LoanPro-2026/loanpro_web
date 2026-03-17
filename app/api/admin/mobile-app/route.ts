import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { writeAdminAuditLog } from '@/lib/adminAudit';
import { getAdminCachedResponse, invalidateAdminCacheByTags, setAdminCachedResponse } from '@/lib/adminResponseCache';

const DEFAULT_ANDROID_RELEASE = {
  latestVersionCode: 1,
  latestVersionName: '1.0.0',
  minVersionCode: 1,
  downloadUrl: '',
  releaseNotes: 'Initial release',
  forceUpdate: false,
  githubTag: '',
  githubReleaseUrl: '',
};

function normalizeRelease(value: any) {
  return {
    latestVersionCode: Math.max(1, Number(value?.latestVersionCode || DEFAULT_ANDROID_RELEASE.latestVersionCode)),
    latestVersionName: String(value?.latestVersionName || DEFAULT_ANDROID_RELEASE.latestVersionName).trim(),
    minVersionCode: Math.max(1, Number(value?.minVersionCode || DEFAULT_ANDROID_RELEASE.minVersionCode)),
    downloadUrl: String(value?.downloadUrl || DEFAULT_ANDROID_RELEASE.downloadUrl).trim(),
    releaseNotes: String(value?.releaseNotes || DEFAULT_ANDROID_RELEASE.releaseNotes).trim(),
    forceUpdate: Boolean(value?.forceUpdate),
    githubTag: String(value?.githubTag || '').trim(),
    githubReleaseUrl: String(value?.githubReleaseUrl || '').trim(),
  };
}

function isValidHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    await enforceAdminAccess(request, {
      permission: 'settings:read',
      rateLimitKey: 'mobile-app:get',
      limit: 60,
      windowMs: 60_000,
    });

    const cacheKey = 'admin:mobile-app:get:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const { db } = await connectToDatabase();
    const record = await db.collection('admin_settings').findOne({ key: 'mobile_app_release' });
    const release = normalizeRelease(record?.value || DEFAULT_ANDROID_RELEASE);

    const payload = {
      success: true,
      release,
      updatedAt: record?.updatedAt || null,
      updatedBy: record?.updatedBy || null,
    };

    setAdminCachedResponse(cacheKey, payload, 30_000, ['settings', 'mobile-app']);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch Android release settings' },
      { status: getAdminErrorStatus(error) }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'settings:write',
      rateLimitKey: 'mobile-app:patch',
      limit: 20,
      windowMs: 60_000,
    });

    const body = await request.json();
    const release = normalizeRelease(body);

    if (!Number.isInteger(release.latestVersionCode) || release.latestVersionCode < 1) {
      return NextResponse.json({ success: false, error: 'latestVersionCode must be a positive integer' }, { status: 400 });
    }

    if (!Number.isInteger(release.minVersionCode) || release.minVersionCode < 1) {
      return NextResponse.json({ success: false, error: 'minVersionCode must be a positive integer' }, { status: 400 });
    }

    if (release.minVersionCode > release.latestVersionCode) {
      return NextResponse.json({ success: false, error: 'minVersionCode cannot be greater than latestVersionCode' }, { status: 400 });
    }

    if (!release.latestVersionName) {
      return NextResponse.json({ success: false, error: 'latestVersionName is required' }, { status: 400 });
    }

    if (!release.downloadUrl || !isValidHttpUrl(release.downloadUrl)) {
      return NextResponse.json({ success: false, error: 'A valid downloadUrl is required' }, { status: 400 });
    }

    if (release.githubReleaseUrl && !isValidHttpUrl(release.githubReleaseUrl)) {
      return NextResponse.json({ success: false, error: 'githubReleaseUrl must be a valid URL' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    await db.collection('admin_settings').updateOne(
      { key: 'mobile_app_release' },
      {
        $set: {
          key: 'mobile_app_release',
          value: release,
          updatedAt: now,
          updatedBy: admin.email,
        },
      },
      { upsert: true }
    );

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'settings.mobile_app_release.update',
      targetType: 'settings',
      targetId: 'mobile_app_release',
      details: {
        latestVersionCode: release.latestVersionCode,
        latestVersionName: release.latestVersionName,
        minVersionCode: release.minVersionCode,
        forceUpdate: release.forceUpdate,
        downloadUrl: release.downloadUrl,
        githubTag: release.githubTag,
        githubReleaseUrl: release.githubReleaseUrl,
      },
    });

    invalidateAdminCacheByTags(['settings', 'mobile-app']);

    return NextResponse.json({
      success: true,
      release,
      updatedAt: now,
      updatedBy: admin.email,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update Android release settings' },
      { status: getAdminErrorStatus(error) }
    );
  }
}