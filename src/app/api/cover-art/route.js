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

  try {
    // Search MusicBrainz for the release group (album)
    const query = `releasegroup:"${title}" AND artist:"${artist}"`;
    const mbResponse = await fetch(
      `${MB_BASE}/release-group/?query=${encodeURIComponent(query)}&limit=5&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (!mbResponse.ok) {
      throw new Error(`MusicBrainz API error: ${mbResponse.status}`);
    }

    const mbData = await mbResponse.json();
    const releaseGroups = mbData['release-groups'];

    if (!releaseGroups || releaseGroups.length === 0) {
      return NextResponse.json({ error: 'No results found' }, { status: 404 });
    }

    // Try each release group until we find one with cover art
    for (const rg of releaseGroups) {
      const coverUrl = `${CAA_BASE}/release-group/${rg.id}/front-500`;

      // Check if cover art exists (HEAD request to avoid downloading the image)
      try {
        const coverCheck = await fetch(coverUrl, { method: 'HEAD', redirect: 'follow' });
        if (coverCheck.ok) {
          return NextResponse.json({
            cover_url: coverUrl,
            mbid: rg.id,
            title: rg.title,
            artist: rg['artist-credit']?.[0]?.name || artist,
          });
        }
      } catch {
        // This release group has no cover art, try next
        continue;
      }
    }

    return NextResponse.json({ error: 'No cover art found for this album' }, { status: 404 });
  } catch (error) {
    console.error('Cover art fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch cover art' }, { status: 500 });
  }
}
