// src/components/ClientPortal/ClientPhotos.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Camera, X, Eye } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientPhotos = ({ clientId }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const loadPhotos = useCallback(async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('work_photos')
        .select('*, applications(object_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Ошибка загрузки фото:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
        <h2 className="font-semibold">Фотоотчёт</h2>
        <p className="text-sm opacity-90">Фотографии выполненных работ</p>
      </div>
      
      {photos.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <Camera className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Фотографий пока нет</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="relative group cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img 
                src={photo.photo_url} 
                alt={photo.description || 'Фото работ'}
                className="w-full h-40 object-cover rounded-lg shadow-md"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">{photo.applications?.object_name}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Модалка просмотра фото */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={selectedPhoto.photo_url} alt="Фото" className="w-full rounded-lg" />
            <div className="absolute bottom-4 left-0 right-0 text-center text-white bg-black/50 p-2">
              <p>{selectedPhoto.description}</p>
              <p className="text-sm">{new Date(selectedPhoto.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPhotos;