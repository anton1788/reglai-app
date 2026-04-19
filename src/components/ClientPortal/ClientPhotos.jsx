// src/components/ClientPortal/ClientPhotos.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Camera, X, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientPhotos = ({ clientId, t }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const loadPhotos = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase
        .from('work_photos')
        .select('*, applications(object_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (queryError) {
        console.error('❌ Ошибка загрузки фото:', queryError);
        
        // 🔥 Обработка специфичных ошибок
        if (queryError.code === 'PGRST116' || queryError.status === 404) {
          setError('Таблица фотоотчётов ещё не создана. Обратитесь к администратору.');
        } else if (queryError.code === '401' || queryError.code === '403') {
          setError('Нет прав для просмотра фотоотчётов.');
        } else {
          setError(queryError.message || 'Ошибка загрузки данных');
        }
        
        setPhotos([]);
        return;
      }

      // 🔥 ВАЖНО: проверяем, что data — это массив
      if (!Array.isArray(data)) {
        console.warn('⚠️ Ожидался массив фото, получено:', data);
        setPhotos([]);
        return;
      }
      
      setPhotos(data);
    } catch (err) {
      console.error('❌ Критическая ошибка загрузки фото:', err);
      setError(err.message || 'Неизвестная ошибка');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <p className="text-red-700 dark:text-red-300 font-medium mb-2">
          {t?.('clientPhotos.loadError') || 'Ошибка загрузки фото'}
        </p>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={loadPhotos}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          {t?.('retry') || 'Повторить'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
        <h2 className="font-semibold">{t?.('clientPhotos.title') || 'Фотоотчёт'}</h2>
        <p className="text-sm opacity-90">{t?.('clientPhotos.subtitle') || 'Фотографии выполненных работ'}</p>
      </div>
      
      {photos.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <Camera className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t?.('clientPhotos.noPhotos') || 'Фотографий пока нет'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* 🔥 Безопасный рендеринг с проверкой массива */}
          {Array.isArray(photos) && photos.map((photo) => (
            <div 
              key={photo?.id || `photo-${Math.random()}`} 
              className="relative group cursor-pointer"
              onClick={() => photo?.id && setSelectedPhoto(photo)}
            >
              <img 
                src={photo?.photo_url} 
                alt={photo?.description || 'Фото работ'}
                className="w-full h-40 object-cover rounded-lg shadow-md"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="14"%3EИзображение недоступно%3C/text%3E%3C/svg%3E';
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                {photo?.applications?.object_name || 'Без объекта'}
              </p>
            </div>
          ))}
        </div>
      )}
      
      {/* Модалка просмотра фото */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" 
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2"
              aria-label="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedPhoto?.photo_url} 
              alt={selectedPhoto?.description || 'Фото'} 
              className="w-full rounded-lg max-h-[80vh] object-contain"
            />
            {selectedPhoto?.description && (
              <div className="absolute bottom-4 left-0 right-0 text-center text-white bg-black/50 p-2 rounded-b-lg">
                <p className="font-medium">{selectedPhoto.description}</p>
                <p className="text-sm opacity-80">
                  {selectedPhoto.created_at && new Date(selectedPhoto.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPhotos;