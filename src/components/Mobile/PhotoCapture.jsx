// src/components/Mobile/PhotoCapture.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Check, Loader2, AlertCircle } from 'lucide-react';
// 🔧 Storage не работает через Proxy — используем raw-клиент
import { rawSupabase as supabase } from '../../utils/supabaseClient';

// ============================================================
// 📸 КОНСТАНТЫ
// ============================================================
const BUCKET_NAME = 'material-photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSION = 1920; // px по длинной стороне
const JPEG_QUALITY = 0.85;
const UPLOAD_TIMEOUT_MS = 30000; // 30 сек на файл

// ============================================================
// 🛠️ ХЕЛПЕРЫ
// ============================================================

/**
 * Сжимает изображение через canvas.
 * Возвращает Blob (JPEG) — в разы меньше исходного.
 */
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    // Если это не изображение — вернуть как есть
    if (!file.type.startsWith('image/')) {
      reject(new Error('Файл не является изображением'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Вычисляем новые размеры, сохраняя пропорции
          let { width, height } = img;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Не удалось сжать изображение'));
                return;
              }
              resolve(blob);
            },
            'image/jpeg',
            JPEG_QUALITY
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
};

/**
 * Генерирует безопасное имя файла.
 */
const generateFileName = (index) => {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 11);
  return `${ts}_${index}_${rand}.jpg`;
};

/**
 * Обёртка над upload с таймаутом.
 */
const uploadWithTimeout = async (uploadPromise, timeoutMs) => {
  return Promise.race([
    uploadPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Превышено время загрузки (30 сек)')), timeoutMs)
    ),
  ]);
};

// ============================================================
// 📸 КОМПОНЕНТ
// ============================================================
const PhotoCapture = ({
  onCapture,
  onClose,
  showNotification: externalShowNotification,
  multiple = true,
  maxPhotos = 5,
  applicationId,
  materialIndex,
  companyId,
  // eslint-disable-next-line no-unused-vars
  userId = null,  // оставлен для совместимости с App.jsx
}) => {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const isMountedRef = useRef(true);

  // ─── Cleanup ───────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Уведомления ───────────────────────────────────────
  const showNotification = useCallback(
    (message, type) => {
      if (typeof externalShowNotification === 'function') {
        externalShowNotification(message, type);
      } else {
        console.log(`[PhotoCapture] ${type}: ${message}`);
      }
    },
    [externalShowNotification]
  );

  // ─── Проверка доступа к камере ─────────────────────────
  const checkCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);
      if (err.name === 'NotAllowedError') {
        setError('❌ Разрешите доступ к камере в настройках браузера');
        showNotification('Разрешите доступ к камере', 'error');
      } else if (err.name === 'NotFoundError') {
        setError('❌ Камера не найдена');
      } else {
        setError(`❌ Ошибка камеры: ${err.message}`);
      }
      return false;
    }
  }, [showNotification]);

  // ─── Добавление фото (общий хелпер) ────────────────────
  const addPhotos = useCallback(
    async (files) => {
      setError(null);

      if (photos.length + files.length > maxPhotos) {
        setError(`Максимум ${maxPhotos} фото`);
        showNotification(`Максимум ${maxPhotos} фото`, 'warning');
        return;
      }

      const newPhotos = [...photos];

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          showNotification(`Пропущен файл (не изображение): ${file.name}`, 'warning');
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          showNotification(
            `Файл "${file.name}" больше ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} МБ`,
            'warning'
          );
          continue;
        }

        // Превью для UI
        const previewUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });

        newPhotos.push({
          preview: previewUrl, // для превью в UI
          file,
          uploaded: false,
          url: null,
          name: file.name,
        });
      }

      setPhotos(newPhotos);
    },
    [photos, maxPhotos, showNotification]
  );

  // ─── Съёмка через камеру ───────────────────────────────
  const capturePhoto = useCallback(async () => {
    setError(null);

    const hasPermission = await checkCameraPermission();
    if (!hasPermission) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = false;

    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      await addPhotos(files);
    };

    input.click();
  }, [checkCameraPermission, addPhotos]);

  // ─── Загрузка из галереи ───────────────────────────────
  const handleFileUpload = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (files.length === 0) return;
      await addPhotos(files);
    },
    [addPhotos]
  );

  // ─── 🔥 ЗАГРУЗКА В SUPABASE STORAGE ────────────────────
  const uploadPhotos = useCallback(
  async (photosToUpload) => {
    if (!photosToUpload || photosToUpload.length === 0) {
      return [];
    }

    // 🛡️ РАННЯЯ ВАЛИДАЦИЯ
    if (!companyId) {
      setError('❌ Не удалось определить компанию');
      showNotification('Не удалось определить компанию', 'error');
      return [];
    }

    if (!supabase) {
      setError('❌ Сервер не настроен. Обратитесь к администратору.');
      showNotification('Ошибка подключения к серверу', 'error');
      return [];
    }

    // 🛡️ Проверка, что storage доступен (защита от Proxy-багов)
    if (!supabase.storage || typeof supabase.storage.from !== 'function') {
      setError('❌ Хранилище недоступно. Обратитесь к администратору.');
      showNotification('Ошибка: хранилище не инициализировано', 'error');
      console.error('[PhotoCapture] supabase.storage is', supabase.storage);
      return [];
    }

    setUploading(true);
      setUploadProgress({ current: 0, total: photosToUpload.length });
      setError(null);

      const uploadedUrls = [];

      try {
        for (let i = 0; i < photosToUpload.length; i++) {
          const photo = photosToUpload[i];
          setUploadProgress({ current: i + 1, total: photosToUpload.length });

          try {
            // 1. Сжимаем фото
            const compressedBlob = await compressImage(photo.file);

            // 2. Формируем путь
            const fileName = generateFileName(i);
            const filePath = `photos/company_${companyId}/app_${applicationId || 'temp'}/material_${materialIndex ?? 0}/${fileName}`;

            // 3. Загружаем в Storage с таймаутом
            const uploadPromise = supabase.storage
              .from(BUCKET_NAME)
              .upload(filePath, compressedBlob, {
                cacheControl: '3600',
                upsert: true, // разрешаем перезапись
                contentType: 'image/jpeg',
              });

            const { data: uploadData, error: uploadError } = await uploadWithTimeout(
              uploadPromise,
              UPLOAD_TIMEOUT_MS
            );

            // 4. Обрабатываем ошибку upload ЯВНО (без base64-fallback!)
            if (uploadError) {
              const errMsg = uploadError.message || 'неизвестная ошибка';
              console.error(`[PhotoCapture] Upload failed for ${fileName}:`, uploadError);

              if (errMsg.includes('Bucket not found')) {
                throw new Error(`Bucket "${BUCKET_NAME}" не найден в Supabase Storage`);
              }
              if (errMsg.includes('row-level security') || errMsg.includes('policy')) {
                throw new Error('Нет прав на загрузку. Проверьте RLS-политики для Storage.');
              }
              if (errMsg.includes('Payload too large') || errMsg.includes('too large')) {
                throw new Error('Файл слишком большой. Максимум 10 МБ.');
              }
              throw new Error(`Ошибка загрузки: ${errMsg}`);
            }

            if (!uploadData?.path) {
              throw new Error('Сервер не вернул путь к файлу');
            }

            // 5. Получаем публичный URL
            const { data: urlData } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(uploadData.path);

            if (!urlData?.publicUrl) {
              throw new Error('Не удалось получить публичный URL');
            }

            uploadedUrls.push(urlData.publicUrl);

            // 6. Обновляем состояние фото
            if (isMountedRef.current) {
              setPhotos((prev) =>
                prev.map((p) =>
                  p.file === photo.file
                    ? { ...p, uploaded: true, url: urlData.publicUrl }
                    : p
                )
              );
            }
          } catch (fileErr) {
            console.error(`[PhotoCapture] Ошибка файла #${i + 1}:`, fileErr);
            // Прерываем всю загрузку — не оставляем частично
            setError(`❌ ${fileErr.message}`);
            showNotification(`Ошибка загрузки: ${fileErr.message}`, 'error');
            setUploading(false);
            setUploadProgress({ current: 0, total: 0 });
            return uploadedUrls; // вернём то, что успели
          }
        }

        // 7. Успех
        if (uploadedUrls.length > 0) {
          showNotification(`✅ Загружено ${uploadedUrls.length} фото`, 'success');
        }

        return uploadedUrls;
      } catch (err) {
        console.error('[PhotoCapture] Upload critical error:', err);
        setError(`❌ ${err.message || 'Ошибка загрузки'}`);
        showNotification('Ошибка загрузки фото', 'error');
        return uploadedUrls;
      } finally {
        if (isMountedRef.current) {
          setUploading(false);
          setUploadProgress({ current: 0, total: 0 });
        }
      }
    },
    [companyId, applicationId, materialIndex, showNotification]
  );

  // ─── Подтверждение ─────────────────────────────────────
  const confirmPhotos = useCallback(async () => {
  // 🛡️ Если уже идёт загрузка — не запускаем повторно
  if (uploading) return;

  const notUploaded = photos.filter((p) => !p.uploaded);

  if (notUploaded.length > 0) {
    const urls = await uploadPhotos(notUploaded);
    if (urls.length === 0) return; // ошибка — не закрываем
  }

  // Собираем URL загруженных фото из state
  const finalUrls = photos.map((p) => p.url).filter(Boolean);

  if (finalUrls.length === 0) {
    setError('Нет загруженных фото');
    return;
  }

  if (typeof onCapture === 'function') {
    onCapture(multiple ? finalUrls : finalUrls[0]);
  }

  if (typeof onClose === 'function') {
    onClose();
  }
}, [photos, uploadPhotos, onCapture, onClose, multiple]);

  // ─── Удаление фото ─────────────────────────────────────
  const removePhoto = useCallback(
    (index) => {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
      setError(null);
    },
    []
  );

  // ─── Очистка ───────────────────────────────────────────
  const clearAll = useCallback(() => {
    setPhotos([]);
    setError(null);
  }, []);

  // ─── Рендер ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center z-[100000] p-4">
      {/* Кнопка закрытия */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-200 transition-colors z-20"
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
            {uploadProgress.total > 0 && (
              <p className="text-gray-400 text-sm mt-1">
                {uploadProgress.current} / {uploadProgress.total}
              </p>
            )}
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4 max-h-96 overflow-y-auto p-2 bg-black/30 rounded-lg">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group">
              <img
                src={photo.preview}
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
          accept="image/*"
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

        {photos.length > 0 && (
          <button
            onClick={confirmPhotos}
            disabled={uploading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors shadow-lg"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Готово ({photos.length})
              </>
            )}
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