import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Read version info from public directory
    const versionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/downloads/version.json`);
    const versionData = await versionResponse.json();
    
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
    
    // Get latest version
    const versionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/downloads/version.json`);
    const latestVersion = await versionResponse.json();
    
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
