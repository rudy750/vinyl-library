'use client';

import { useState } from 'react';

const CONDITIONS = ['Mint', 'Near Mint', 'Very Good', 'Good', 'Fair', 'Poor'];
const GENRES = ['Rock', 'Classic Rock', 'Alternative', 'Jazz', 'Blues', 'Electronic', 'Hip Hop', 'Classical', 'Soul', 'Funk', 'Reggae', 'Pop', 'Metal', 'Punk', 'Folk', 'Country', 'R&B', 'Indie', 'Grunge', 'Other'];

export default function VinylForm({ vinyl, onSubmit, onCancel }) {
  const [coverUrl, setCoverUrl] = useState(vinyl?.cover_url || '');
  const [fetchingCover, setFetchingCover] = useState(false);
  const [coverError, setCoverError] = useState('');

  const fetchCoverArt = async () => {
    const title = document.getElementById('title')?.value;
    const artist = document.getElementById('artist')?.value;

    if (!title || !artist) {
      setCoverError('Enter both title and artist first');
      return;
    }

    setFetchingCover(true);
    setCoverError('');

    try {
      const res = await fetch(`/api/cover-art?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Not found');
      }
      const data = await res.json();
      setCoverUrl(data.cover_url);
    } catch (err) {
      setCoverError(err.message || 'Could not find cover art');
    } finally {
      setFetchingCover(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      artist: formData.get('artist'),
      year: formData.get('year') ? parseInt(formData.get('year')) : null,
      genre: formData.get('genre') || null,
      label: formData.get('label') || null,
      condition: formData.get('condition') || null,
      notes: formData.get('notes') || null,
      cover_url: coverUrl || formData.get('cover_url') || null,
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            defaultValue={vinyl?.title || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Album title"
          />
        </div>
        <div>
          <label htmlFor="artist" className="block text-sm font-medium text-gray-700 mb-1">
            Artist *
          </label>
          <input
            type="text"
            id="artist"
            name="artist"
            required
            defaultValue={vinyl?.artist || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Artist name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <input
            type="number"
            id="year"
            name="year"
            min="1900"
            max={new Date().getFullYear()}
            defaultValue={vinyl?.year || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="1973"
          />
        </div>
        <div>
          <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">
            Genre
          </label>
          <select
            id="genre"
            name="genre"
            defaultValue={vinyl?.genre || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select genre</option>
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            defaultValue={vinyl?.condition || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select condition</option>
            {CONDITIONS.map((cond) => (
              <option key={cond} value={cond}>{cond}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
          Record Label
        </label>
        <input
          type="text"
          id="label"
          name="label"
          defaultValue={vinyl?.label || ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Atlantic Records"
        />
      </div>

      <div>
        <label htmlFor="cover_url" className="block text-sm font-medium text-gray-700 mb-1">
          Cover Image URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            id="cover_url"
            name="cover_url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="https://example.com/album-cover.jpg"
          />
          <button
            type="button"
            onClick={fetchCoverArt}
            disabled={fetchingCover}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {fetchingCover ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Searching...
              </>
            ) : (
              'Fetch Cover'
            )}
          </button>
        </div>
        {coverError && (
          <p className="text-sm text-red-600 mt-1">{coverError}</p>
        )}
        {coverUrl && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={coverUrl}
              alt="Album cover preview"
              className="w-16 h-16 object-cover rounded-lg shadow-sm"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-sm text-green-600">Cover art loaded</span>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={vinyl?.notes || ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="First pressing, includes original inner sleeve..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          {vinyl ? 'Update' : 'Add'} Vinyl
        </button>
      </div>
    </form>
  );
}
