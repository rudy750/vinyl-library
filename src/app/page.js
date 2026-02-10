'use client';

import { useState, useEffect } from 'react';
import VinylCard from '@/components/VinylCard';
import VinylForm from '@/components/VinylForm';
import Modal from '@/components/Modal';
import TrackList from '@/components/TrackList';
import AlbumAdvisor from '@/components/AlbumAdvisor';

export default function Home() {
  const [vinyls, setVinyls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVinyl, setEditingVinyl] = useState(null);
  const [error, setError] = useState(null);
  const [resolvingArt, setResolvingArt] = useState(false);
  const [tracklistVinyl, setTracklistVinyl] = useState(null);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);

  const fetchVinyls = async () => {
    try {
      const response = await fetch('/api/vinyls');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setVinyls(data);
    } catch (err) {
      setError('Failed to load vinyl collection');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveArt = async () => {
    setResolvingArt(true);
    try {
      const response = await fetch('/api/cover-art/resolve-all', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error('Failed to resolve');
      
      let message = `Resolved ${data.resolved} covers out of ${data.processed} checked.`;
      if (data.failures > 0) message += ` ${data.failures} failed.`;
      
      alert(message);
      await fetchVinyls();
    } catch (err) {
      alert('Failed to resolve artwork');
    } finally {
      setResolvingArt(false);
    }
  };

  const searchVinyls = async (query) => {
    if (!query.trim()) {
      fetchVinyls();
      return;
    }
    try {
      const response = await fetch(`/api/vinyls/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search');
      const data = await response.json();
      setVinyls(data);
    } catch (err) {
      setError('Failed to search');
    }
  };

  useEffect(() => {
    fetchVinyls();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchVinyls(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAddVinyl = async (data) => {
    try {
      const response = await fetch('/api/vinyls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add');
      await fetchVinyls();
      setIsModalOpen(false);
    } catch (err) {
      setError('Failed to add vinyl');
    }
  };

  const handleUpdateVinyl = async (data) => {
    try {
      const response = await fetch(`/api/vinyls/${editingVinyl.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      await fetchVinyls();
      setIsModalOpen(false);
      setEditingVinyl(null);
    } catch (err) {
      setError('Failed to update vinyl');
    }
  };

  const handleDeleteVinyl = async (id) => {
    if (!confirm('Are you sure you want to delete this vinyl?')) return;
    try {
      const response = await fetch(`/api/vinyls/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      await fetchVinyls();
    } catch (err) {
      setError('Failed to delete vinyl');
    }
  };

  const openAddModal = () => {
    setEditingVinyl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (vinyl) => {
    setEditingVinyl(vinyl);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVinyl(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Vinyl Library</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Search your collection..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Add Vinyl</span>
              </button>

              <button
                onClick={() => setIsAdvisorOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : vinyls.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No vinyls found' : 'Your collection is empty'}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Try a different search term' : 'Start building your vinyl library by adding your first record'}
            </p>
            {!searchQuery && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Your First Vinyl
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-600">
                {vinyls.length} {vinyls.length === 1 ? 'record' : 'records'} in your collection
              </p>
              {vinyls.some(v => !v.cover_url) && (
                <button
                  onClick={handleResolveArt}
                  disabled={resolvingArt}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {resolvingArt ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Resolving...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Resolve All Art
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vinyls.map((vinyl) => (
                <VinylCard
                  key={vinyl.id}
                  vinyl={vinyl}
                  onEdit={openEditModal}
                  onDelete={handleDeleteVinyl}
                  onClick={setTracklistVinyl}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingVinyl ? 'Edit Vinyl' : 'Add New Vinyl'}
      >
        <VinylForm
          vinyl={editingVinyl}
          onSubmit={editingVinyl ? handleUpdateVinyl : handleAddVinyl}
          onCancel={closeModal}
        />
      </Modal>

      {/* Tracklist Modal */}
      <Modal
        isOpen={!!tracklistVinyl}
        onClose={() => setTracklistVinyl(null)}
        title={tracklistVinyl ? `${tracklistVinyl.title} — ${tracklistVinyl.artist}` : ''}
      >
        {tracklistVinyl && (
          <TrackList artist={tracklistVinyl.artist} title={tracklistVinyl.title} />
        )}
      </Modal>

      {/* Album Advisor Modal */}
      <Modal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        title="Album Advisor"
        wide
      >
        <AlbumAdvisor onClose={() => setIsAdvisorOpen(false)} />
      </Modal>
    </div>
  );
}
