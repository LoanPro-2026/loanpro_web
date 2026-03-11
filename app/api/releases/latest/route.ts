import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const OWNER = process.env.GITHUB_RELEASE_OWNER || 'jakshat296';
const REPO = process.env.GITHUB_RELEASE_REPO || 'loanpro_web';

type GitHubAsset = {
  name?: string;
  browser_download_url?: string;
  size?: number;
};

type GitHubRelease = {
  tag_name?: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GitHubAsset[];
};

function normalizeVersion(tagName: string | undefined): string {
  return String(tagName || '').replace(/^v/i, '').trim();
}

function toReleaseResponse(release: GitHubRelease, asset: GitHubAsset) {
  return {
    version: normalizeVersion(release.tag_name),
    publishedAt: release.published_at || new Date().toISOString(),
    assetName: String(asset.name || ''),
    downloadUrl: String(asset.browser_download_url || ''),
    assetSizeBytes: Number(asset.size || 0),
  };
}

export async function GET() {
  try {
    const releaseUrl = `https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=15`;
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'LoanPro-Web',
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(releaseUrl, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`GitHub release fetch failed: ${response.status}`);
    }

    const releases = (await response.json()) as GitHubRelease[];
    const sortedReleases = [...releases].sort((a, b) => {
      const aTime = a?.published_at ? new Date(a.published_at).getTime() : 0;
      const bTime = b?.published_at ? new Date(b.published_at).getTime() : 0;
      return bTime - aTime;
    });

    for (const release of sortedReleases) {
      if (release?.draft) {
        continue;
      }

      const exeAsset = (release.assets || []).find((asset) => {
        const name = String(asset?.name || '').toLowerCase();
        return name.endsWith('.exe') && Boolean(asset?.browser_download_url);
      });

      if (exeAsset) {
        return NextResponse.json(
          {
            success: true,
            release: {
              ...toReleaseResponse(release, exeAsset),
              prerelease: Boolean(release.prerelease),
            },
          },
          {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
            },
          }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'No release with a Windows installer was found.',
      },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('[RELEASES_LATEST] Failed to fetch latest release:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to fetch latest release right now.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
