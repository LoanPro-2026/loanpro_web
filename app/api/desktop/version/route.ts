import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

interface DesktopVersionManifest {
  version: string;
  downloadUrl: string;
  releaseDate?: string;
  changelog?: string[];
  systemRequirements?: string[];
  checksum?: string;
}

const VERSION_MANIFEST_PATH = path.join(process.cwd(), 'public', 'downloads', 'version.json');

const readVersionManifest = async (): Promise<DesktopVersionManifest> => {
  const fileContent = await readFile(VERSION_MANIFEST_PATH, 'utf8');
  const parsed = JSON.parse(fileContent) as Partial<DesktopVersionManifest>;

  if (!parsed.version || !parsed.downloadUrl) {
    throw new Error('Desktop version manifest is invalid');
  }

  return {
    version: parsed.version,
    downloadUrl: parsed.downloadUrl,
    releaseDate: parsed.releaseDate,
    changelog: Array.isArray(parsed.changelog) ? parsed.changelog : [],
    systemRequirements: Array.isArray(parsed.systemRequirements) ? parsed.systemRequirements : [],
    checksum: parsed.checksum,
  };
};

export async function GET() {
  try {
    const versionData = await readVersionManifest();
    
    return NextResponse.json({
      success: true,
      version: versionData.version,
      downloadUrl: versionData.downloadUrl,
      releaseDate: versionData.releaseDate,
      changelog: versionData.changelog,
      systemRequirements: versionData.systemRequirements,
      checksum: versionData.checksum
    });
  } catch (error) {
    logger.error('Version check failed', error, 'DESKTOP_VERSION');
    return toSafeErrorResponse(error, 'DESKTOP_VERSION', 'Failed to check for updates');
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request,
      scope: 'desktop-version-check',
      limit: 120,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(request, { maxBytes: 16 * 1024 });
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.data as Record<string, any>;
    const currentVersion = typeof body.currentVersion === 'string' ? body.currentVersion.trim() : '';
    
    const latestVersion = await readVersionManifest();
    
    // Compare versions (simple string comparison for now)
    const isUpdateAvailable = currentVersion !== latestVersion.version;
    
    return NextResponse.json({
      success: true,
      updateAvailable: isUpdateAvailable,
      latestVersion: latestVersion.version,
      currentVersion,
      downloadUrl: latestVersion.downloadUrl,
      changelog: isUpdateAvailable ? latestVersion.changelog : []
    });
  } catch (error) {
    logger.error('Update check failed', error, 'DESKTOP_VERSION');
    return toSafeErrorResponse(error, 'DESKTOP_VERSION', 'Failed to check for updates');
  }
}
