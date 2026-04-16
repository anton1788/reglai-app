import React, { useState, useEffect } from 'react';
import { Image, Download, Trash2 } from 'lucide-react';
import { photoService } from '../utils/photoService';

const PhotoGallery = ({ applicationId, userRole, onPhotoDeleted }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadPhotos();
  }, [applicationId]);
  
  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await photoService.getApplicationPhotos(applicationId);
      setPhotos(data);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (photoId, photoUrl) => {
    if (confirm('Удалить фото?')) {
      await photoService.deletePhoto(photoId, photoUrl);
      await loadPhotos();
      onPhotoDeleted?.();
    }
  };
  
  const handleDownloadReport = async () => {
    const html = await photoService.generatePhotoReport(applicationId);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photo_report_${applicationId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (loading) return <div className="text-center py-4">Загрузка фото...</div>;
  if (photos.length === 0) return <div className="text-center py-4 text-gray-500">Нет фото</div>;
  
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium flex items-center gap-2">
          <Image className="w-4 h-4" />
          Фотофиксация ({photos.length})
        </h4>
        <button
          onClick={handleDownloadReport}
          className="text-sm text-blue-600 flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          Отчет
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.photo_url}
              alt={`Material ${photo.material_index + 1}`}
              className="w-full h-24 object-cover rounded cursor-pointer"
              onClick={() => window.open(photo.photo_url)}
            />
            {(userRole === 'supply_admin' || userRole === 'manager') && (
              <button
                onClick={() => handleDelete(photo.id, photo.photo_url)}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-white" />
              </button>
            )}
            <div className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
              Мат. #{photo.material_index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoGallery;