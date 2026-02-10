import { NextResponse } from 'next/server';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'VinylLibrary/1.0 (vinyl-library-app)';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');
  const title = searchParams.get('title');

  if (!artist || !title) {
    return NextResponse.json({ error: 'Artist and title are required' }, { status: 400 });
  }

  try {
    const query = `release:"${title}" AND artist:"${artist}"`;
    const searchRes = await fetch(
      `${MB_BASE}/release/?query=${encodeURIComponent(query)}&limit=20&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'MusicBrainz search failed' }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const releases = searchData.releases || [];

    if (releases.length === 0) {
      return NextResponse.json({ error: 'No releases found' }, { status: 404 });
    }

    // Prefer vinyl format releases, fall back to first result
    const vinylRelease = releases.find(r =>
      r.media?.some(m => m.format?.toLowerCase().includes('vinyl'))
    );
    const releaseId = (vinylRelease || releases[0]).id;

    // Fetch full release with recordings
    const releaseRes = await fetch(
      `${MB_BASE}/release/${releaseId}?inc=recordings+media&fmt=json`,
      { headers: { 'User-Agent': USER_AGENT } }
    );

    if (!releaseRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch release details' }, { status: 502 });
    }

    const release = await releaseRes.json();

    // Build sides from all media. Vinyl releases often store tracks in a
    // single medium with side-prefixed numbers (A1, B1, C1…). When that
    // pattern is detected, group by the letter prefix. Otherwise, treat
    // each medium as its own side.
    let sides = [];

    for (const medium of release.media || []) {
      const tracks = medium.tracks || [];
      const hasSidePrefix = tracks.length > 0 && tracks.every(t => /^[A-Z]\d/i.test(t.number));

      if (hasSidePrefix) {
        const grouped = {};
        for (const track of tracks) {
          const sideLetter = track.number.charAt(0).toUpperCase();
          if (!grouped[sideLetter]) grouped[sideLetter] = [];
          grouped[sideLetter].push({
            title: track.title,
            length: track.length,
          });
        }
        for (const letter of Object.keys(grouped).sort()) {
          sides.push({
            title: `Side ${letter}`,
            tracks: grouped[letter].map((t, i) => ({ position: i + 1, ...t })),
          });
        }
      } else {
        sides.push({
          title: medium.title || `Side ${String.fromCharCode(65 + sides.length)}`,
          tracks: tracks.map((track, i) => ({
            position: i + 1,
            title: track.title,
            length: track.length,
          })),
        });
      }
    }

    return NextResponse.json({
      title: release.title,
      artist,
      media: sides,
    });
  } catch (error) {
    console.error('Tracklist fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tracklist' }, { status: 500 });
  }
}
