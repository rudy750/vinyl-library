import { NextResponse } from 'next/server';
import db, { getAllVinyls, updateVinyl, getVinylById } from '@/lib/db';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const CAA_BASE = 'https://coverartarchive.org';
const USER_AGENT = 'VinylLibrary/1.0 (vinyl-library-app)';

// Helper function to get final URL after following redirects
async function getFinalImageUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (response.ok && response.url !== url) {
      return response.url; // Return the final URL after redirect
    }
    return response.ok ? url : null;
  } catch {
    return null;
  }
}

async function findCoverArt(artist, title) {
  // Try individual releases first (more reliable for cover art)
  const releaseQuery = `release:"${title}" AND artist:"${artist}"`;
  const releaseResponse = await fetch(
    `${MB_BASE}/release/?query=${encodeURIComponent(releaseQuery)}&limit=5&fmt=json`,
    { headers: { 'User-Agent': USER_AGENT } }
  );

  if (releaseResponse.ok) {
    const releaseData = await releaseResponse.json();
    const releases = releaseData['releases'];

    if (releases && releases.length > 0) {
      for (const release of releases) {
        const coverUrl = `${CAA_BASE}/release/${release.id}/front-500`;
        const finalUrl = await getFinalImageUrl(coverUrl);
        if (finalUrl) {
          return finalUrl;
        }
      }
    }
  }

  // Fallback: Try release-group search, then get a release from it
  const query = `releasegroup:"${title}" AND artist:"${artist}"`;
  const mbResponse = await fetch(
    `${MB_BASE}/release-group/?query=${encodeURIComponent(query)}&limit=5&fmt=json`,
    { headers: { 'User-Agent': USER_AGENT } }
  );

  if (!mbResponse.ok) return null;

  const mbData = await mbResponse.json();
  const releaseGroups = mbData['release-groups'];

  if (!releaseGroups || releaseGroups.length === 0) return null;

  // Try each release group by getting its releases
  for (const rg of releaseGroups) {
    // Get releases for this release group
    const rgReleasesResponse = await fetch(
      `${MB_BASE}/release/?release-group=${rg.id}&limit=5&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (rgReleasesResponse.ok) {
      const rgReleasesData = await rgReleasesResponse.json();
      const rgReleases = rgReleasesData['releases'] || [];

      for (const release of rgReleases) {
        const coverUrl = `${CAA_BASE}/release/${release.id}/front-500`;
        const finalUrl = await getFinalImageUrl(coverUrl);
        if (finalUrl) {
          return finalUrl;
        }
      }
    }
  }

  // 3. Last resort: iTunes Search API
  try {
    const itunesTerm = encodeURIComponent(`${artist} ${title}`);
    const itunesResponse = await fetch(
      `https://itunes.apple.com/search?term=${itunesTerm}&media=music&entity=album&limit=1`
    );

    if (itunesResponse.ok) {
      const itunesData = await itunesResponse.json();
      if (itunesData.resultCount > 0) {
        // Upgrade image quality
        return itunesData.results[0].artworkUrl100.replace('100x100', '600x600');
      }
    }
  } catch (error) {
    console.error('iTunes fallback error in resolve-all:', error);
  }

  return null;
}

// POST /api/cover-art/resolve-all - Resolves cover art for all records missing it
export async function POST() {
  const vinyls = getAllVinyls();
  const needsCover = vinyls.filter(v => !v.cover_url);
  const results = [];

  for (const vinyl of needsCover) {
    try {
      const coverUrl = await findCoverArt(vinyl.artist, vinyl.title);
      if (coverUrl) {
        // Update the record directly in DB
        db.prepare('UPDATE vinyls SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(coverUrl, vinyl.id);
        results.push({ id: vinyl.id, title: vinyl.title, status: 'found', cover_url: coverUrl });
      } else {
        results.push({ id: vinyl.id, title: vinyl.title, status: 'not_found' });
      }
      // Small delay to be polite to MusicBrainz API (1 req/sec)
      await new Promise(resolve => setTimeout(resolve, 1100));
    } catch (err) {
      results.push({ id: vinyl.id, title: vinyl.title, status: 'error', error: err.message });
    }
  }

  const resolved = results.filter(r => r.status === 'found').length;
  const failures = results.filter(r => r.status === 'error').length;
  return NextResponse.json({ 
    resolved, 
    processed: results.length,
    failures,
    results 
  });
}
