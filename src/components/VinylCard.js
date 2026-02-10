'use client';

import { useState } from 'react';

const conditionColors = {
  'Mint': 'bg-green-100 text-green-800',
  'Near Mint': 'bg-emerald-100 text-emerald-800',
  'Very Good': 'bg-blue-100 text-blue-800',
  'Good': 'bg-yellow-100 text-yellow-800',
  'Fair': 'bg-orange-100 text-orange-800',
  'Poor': 'bg-red-100 text-red-800',
};

function NoArtFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}

export default function VinylCard({ vinyl, onEdit, onDelete, onClick }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer" onClick={() => onClick(vinyl)}>
      <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 relative">
        {vinyl.cover_url && !imgError ? (
          <img
            src={vinyl.cover_url}
            alt={`${vinyl.title} cover`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <NoArtFallback />
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 truncate" title={vinyl.title}>
          {vinyl.title}
        </h3>
        <p className="text-gray-600 truncate" title={vinyl.artist}>
          {vinyl.artist}
        </p>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {vinyl.year && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
              {vinyl.year}
            </span>
          )}
          {vinyl.genre && (
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
              {vinyl.genre}
            </span>
          )}
          {vinyl.condition && (
            <span className={`text-xs px-2 py-1 rounded-full ${conditionColors[vinyl.condition]}`}>
              {vinyl.condition}
            </span>
          )}
        </div>
        
        {vinyl.label && (
          <p className="text-xs text-gray-500 mt-2 truncate" title={vinyl.label}>
            {vinyl.label}
          </p>
        )}
        
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(vinyl); }}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(vinyl.id); }}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
