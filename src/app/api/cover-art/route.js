import { NextResponse } from 'next/server';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const CAA_BASE = 'https://coverartarchive.org';
const USER_AGENT = 'VinylLibrary/1.0 (vinyl-library-app)';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');
  const title = searchParams.get('title');

  if (!artist || !title) {
    return NextResponse.json({ error: 'Artist and title are required' }, { status: 400 });
  }

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

  try {
    // 1. Try individual releases first (more reliable for cover art)
    const relQuery = `release:"${title}" AND artist:"${artist}"`;
    const relResponse = await fetch(
      `${MB_BASE}/release/?query=${encodeURIComponent(relQuery)}&limit=5&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (relResponse.ok) {
      const relData = await relResponse.json();
      const releases = relData['releases'] || [];

      for (const release of releases) {
        const coverUrl = `${CAA_BASE}/release/${release.id}/front-500`;
        const finalUrl = await getFinalImageUrl(coverUrl);
        if (finalUrl) {
          return NextResponse.json({
            cover_url: finalUrl,
            mbid: release.id,
            title: release.title,
            artist: release['artist-credit']?.[0]?.name || artist,
            source: 'release',
          });
        }
      }
    }

    // 2. Fallback: Try release-group search, then get a release from it
    const rgQuery = `releasegroup:"${title}" AND artist:"${artist}"`;
    const rgResponse = await fetch(
      `${MB_BASE}/release-group/?query=${encodeURIComponent(rgQuery)}&limit=5&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (rgResponse.ok) {
      const rgData = await rgResponse.json();
      const releaseGroups = rgData['release-groups'] || [];

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
              return NextResponse.json({
                cover_url: finalUrl,
                mbid: release.id,
                title: release.title,
                artist: release['artist-credit']?.[0]?.name || artist,
                source: 'release-group',
              });
            }
          }
        }
      }
    }

    // 3. Last resort: iTunes Search API (Free, no key)
    try {
      const itunesTerm = encodeURIComponent(`${artist} ${title}`);
      const itunesResponse = await fetch(
        `https://itunes.apple.com/search?term=${itunesTerm}&media=music&entity=album&limit=1`
      );

      if (itunesResponse.ok) {
        const itunesData = await itunesResponse.json();
        if (itunesData.resultCount > 0) {
          const result = itunesData.results[0];
          // Get higher resolution image by replacing dimensions in URL
          const highResUrl = result.artworkUrl100.replace('100x100', '600x600');

          return NextResponse.json({
            cover_url: highResUrl,
            title: result.collectionName,
            artist: result.artistName,
            source: 'itunes',
          });
        }
      }
    } catch (itunesError) {
      console.error('iTunes fallback error:', itunesError);
    }

    return NextResponse.json({ error: 'No cover art found for this album' }, { status: 404 });
  } catch (error) {
    console.error('Cover art fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch cover art' }, { status: 500 });
  }
}
