// src/components/Mobile/PhotoCapture.jsx
import React, { useState, useRef } from 'react'; // ← убрали useEffect
import { Camera, Upload, X, Check, Loader2, AlertCircle } from 'lucide-react';

const PhotoCapture = ({ 
  onCapture, 
  onClose, 
  showNotification: externalShowNotification,
  multiple = false, 
  maxPhotos = 5,
  applicationId,
  materialIndex,
  companyId,
  userId // ← оставляем, но добавим комментарий, чтобы ESLint не ругался
}) => {
   // Добавить логирование в начале компонента
  React.useEffect(() => {
    if (userId) {
      console.log('[PhotoCapture] User ID:', userId);
    }
  }, [userId]);
  
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const showNotification = (message, type) => {
    if (externalShowNotification) {
      externalShowNotification(message, type);
    } else {
      console.log(`[PhotoCapture] ${type}: ${message}`);
    }
  };
  
  // ✅ ПРОВЕРКА ДОСТУПА К КАМЕРЕ
  const checkCameraPermission = async () => {
    try {
      // Проверяем, есть ли доступ к камере через MediaDevices API
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);
      if (err.name === 'NotAllowedError') {
        setError('❌ Разрешите доступ к камере в настройках браузера');
        showNotification('Разрешите доступ к камере в настройках браузера', 'error');
      } else if (err.name === 'NotFoundError') {
        setError('❌ Камера не найдена на устройстве');
      } else {
        setError(`❌ Ошибка: ${err.message}`);
      }
      return false;
    }
  };
  
  // ✅ ФУНКЦИЯ СЪЁМКИ ФОТО
  const capturePhoto = async () => {
    console.log('[PhotoCapture] capturePhoto вызван');
    console.log('[PhotoCapture] navigator.mediaDevices:', navigator.mediaDevices);
    
    setError(null);
    
    // Проверяем разрешение на камеру
    const hasPermission = await checkCameraPermission();
    console.log('[PhotoCapture] hasPermission:', hasPermission);
    
    if (!hasPermission) return;
    
    // Создаём input с атрибутом capture для открытия камеры
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = false;
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      
      if (photos.length + files.length > maxPhotos) {
        setError(`Максимум ${maxPhotos} фото`);
        showNotification(`Максимум ${maxPhotos} фото`, 'warning');
        return;
      }
      
      const newPhotos = [...photos];
      for (const file of files) {
        const reader = new FileReader();
        const photoData = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        newPhotos.push({ 
          data: photoData, 
          file: file,
          uploaded: false,
          name: file.name 
        });
      }
      
      setPhotos(newPhotos);
      
      if (!multiple && newPhotos.length === 1) {
        await uploadPhotos([newPhotos[newPhotos.length - 1]]);
      }
    };
    
    input.click();
  };
  
  // ✅ ЗАГРУЗКА ИЗ ГАЛЕРЕИ
  const handleFileUpload = async (event) => {
    setError(null);
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    const total = photos.length + files.length;
    if (total > maxPhotos) {
      setError(`Максимум ${maxPhotos} фото`);
      showNotification(`Максимум ${maxPhotos} фото`, 'warning');
      return;
    }
    
    const newPhotos = [...photos];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showNotification('Можно загружать только изображения', 'warning');
        continue;
      }
      
      const reader = new FileReader();
      const photoData = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      
      newPhotos.push({ 
        data: photoData, 
        file: file,
        uploaded: false,
        name: file.name 
      });
    }
    
    setPhotos(newPhotos);
    event.target.value = '';
    
    if (!multiple && newPhotos.length === 1) {
      await uploadPhotos([newPhotos[0]]);
    }
  };
  
  // ✅ ФУНКЦИЯ ЗАГРУЗКИ
  const uploadPhotos = async (photosToUpload) => {
    if (!photosToUpload || photosToUpload.length === 0) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const uploadedUrls = [];
      
      for (let i = 0; i < photosToUpload.length; i++) {
        const photo = photosToUpload[i];
        let photoUrl = null;
        
        try {
          const { supabase } = await import('../../utils/supabaseClient');
          
          if (supabase && companyId) {
            const fileName = `${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}.jpg`;
            const filePath = `photos/company_${companyId}/app_${applicationId || 'temp'}/material_${materialIndex || 0}/${fileName}`;
            
            const blob = await fetch(photo.data).then(res => res.blob());
            
            const { error: uploadError } = await supabase.storage
              .from('material-photos')
              .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: false
              });
            
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('material-photos')
                .getPublicUrl(filePath);
              photoUrl = publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('Storage upload failed, using base64:', storageErr);
        }
        
        if (!photoUrl) {
          photoUrl = photo.data;
        }
        
        uploadedUrls.push(photoUrl);
        
        setPhotos(prev => prev.map(p => 
          p.data === photo.data ? { ...p, uploaded: true, url: photoUrl } : p
        ));
      }
      
      if (onCapture) {
        onCapture(multiple ? uploadedUrls : uploadedUrls[0]);
      }
      
      showNotification(`✅ Загружено ${uploadedUrls.length} фото`, 'success');
      
      if (!multiple) {
        setTimeout(onClose, 1000);
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      setError('❌ Ошибка загрузки фото: ' + error.message);
      showNotification('❌ Ошибка загрузки фото', 'error');
    } finally {
      setUploading(false);
    }
  };
  
  // ✅ ПОДТВЕРЖДЕНИЕ ВСЕХ ФОТО
  const confirmPhotos = async () => {
    const notUploaded = photos.filter(p => !p.uploaded);
    if (notUploaded.length > 0) {
      await uploadPhotos(notUploaded);
    } else if (onCapture) {
      onCapture(photos.map(p => p.url));
      onClose();
    }
  };
  
  // ✅ УДАЛЕНИЕ ФОТО
  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };
  
  // ✅ ОЧИСТКА ВСЕХ
  const clearAll = () => {
    setPhotos([]);
    setError(null);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center z-[100000] p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
        disabled={uploading}
        aria-label="Закрыть"
      >
        <X className="w-5 h-5" />
      </button>
      
      <h3 className="text-white text-xl mb-4 font-semibold">
        {materialIndex !== null && materialIndex !== undefined 
          ? `Фотофиксация материала #${materialIndex + 1}` 
          : 'Общая фотофиксация'}
      </h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm max-w-md text-center">
          {error}
        </div>
      )}
      
      {uploading && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Загрузка фото...</p>
          </div>
        </div>
      )}
      
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4 max-h-96 overflow-y-auto p-2 bg-black/30 rounded-lg">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group">
              <img 
                src={photo.data} 
                alt={`Фото ${idx + 1}`} 
                className="w-28 h-28 object-cover rounded-lg shadow-md" 
              />
              {!photo.uploaded && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
              {photo.uploaded && (
                <div className="absolute top-1 right-1">
                  <Check className="w-5 h-5 text-green-500 bg-white rounded-full p-0.5" />
                </div>
              )}
              <button
                onClick={() => removePhoto(idx)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                disabled={uploading}
                aria-label="Удалить фото"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          onClick={capturePhoto}
          disabled={uploading || photos.length >= maxPhotos}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          <Camera className="w-5 h-5" />
          Снять фото
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || photos.length >= maxPhotos}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          <Upload className="w-5 h-5" />
          Загрузить
        </button>
        
        {photos.length > 0 && !multiple && (
          <button
            onClick={clearAll}
            disabled={uploading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
            Очистить
          </button>
        )}
        
        {multiple && photos.length > 0 && photos.every(p => p.uploaded) && (
          <button
            onClick={confirmPhotos}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 transition-colors shadow-lg"
          >
            <Check className="w-5 h-5" />
            Готово ({photos.length})
          </button>
        )}
      </div>
      
      <div className="text-center mt-4">
        <p className="text-gray-400 text-sm">
          {photos.length}/{maxPhotos} фото
        </p>
        {materialIndex === null && (
          <p className="text-gray-500 text-xs mt-1">
            Фото без привязки к конкретному материалу
          </p>
        )}
      </div>
    </div>
  );
};

export default PhotoCapture;