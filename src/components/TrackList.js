'use client';

import { useState, useEffect } from 'react';

function formatDuration(ms) {
  if (!ms) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function TrackList({ artist, title }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTracks() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/tracklist?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load tracklist');
        }
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTracks();
  }, [artist, title]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-12 h-12 animate-spin">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 shadow-sm" />
              <div className="absolute inset-2 rounded-full bg-gray-900" />
              <div className="absolute inset-[18px] rounded-full bg-gray-100" />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/70" />
            </div>
          </div>
          <div className="absolute right-0 top-0 w-4 h-4 bg-gray-800 rounded-full shadow-sm" />
          <div className="absolute right-3 top-3 w-9 h-2 bg-gray-600 rounded-full origin-left rotate-[32deg] shadow-sm" />
          <div className="absolute right-6 top-5 w-4 h-2 bg-gray-500 rounded-sm rotate-[32deg] shadow-sm" />
          <div className="absolute right-7 top-6 w-2 h-2 bg-gray-300 rounded-sm rotate-[32deg]" />
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-gray-500 py-4 text-center">{error}</p>;
  }

  if (!data || data.media.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No tracklist available</p>;
  }

  return (
    <div className="space-y-4">
      {data.media.map((medium) => (
        <div key={medium.position}>
          <h4 className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-2">
            {medium.title}
          </h4>
          <ol className="divide-y divide-gray-100">
            {medium.tracks.map((track) => (
              <li key={track.position} className="flex items-center gap-3 py-2 text-sm">
                <span className="text-gray-400 w-6 text-right shrink-0">{track.position}</span>
                <span className="text-gray-900 flex-1 truncate">{track.title}</span>
                {track.length && (
                  <span className="text-gray-400 shrink-0">{formatDuration(track.length)}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
