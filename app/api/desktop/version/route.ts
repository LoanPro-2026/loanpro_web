import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

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
    console.error('Version check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check for updates'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { currentVersion } = await request.json();
    
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
    console.error('Update check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check for updates'
    }, { status: 500 });
  }
}
