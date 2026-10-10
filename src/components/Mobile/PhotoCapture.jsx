// src/components/Mobile/PhotoCapture.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Check, Loader2 } from 'lucide-react';
// 🔧 Storage не работает через Proxy — используем raw-клиент
import { rawSupabase as supabase } from '../../utils/supabaseClient';

// ============================================================
// 📸 КОНСТАНТЫ
// ============================================================
const BUCKET_NAME = 'material-photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSION = 1920;             // px по длинной стороне
const JPEG_QUALITY = 0.85;
const UPLOAD_TIMEOUT_MS = 60000;        // 60 сек (Vercel cold start бывает долгим)

// ============================================================
// 🛠️ ХЕЛПЕРЫ
// ============================================================

/**
 * Сжимает изображение через canvas.
 * Возвращает Blob (JPEG) — в разы меньше исходного.
 */
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Файл не является изображением'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
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
const uploadWithTimeout = (uploadPromise, timeoutMs) => {
  return Promise.race([
    uploadPromise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Превышено время загрузки (${Math.round(timeoutMs / 1000)} сек)`)),
        timeoutMs
      )
    ),
  ]);
};

/**
 * Fallback: загрузка напрямую через fetch в Storage REST API.
 * Используется, если SDK-клиент молча висит.
 */
const uploadViaFetch = async (filePath, blob) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Отсутствуют VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY');
  }

  // Получаем access_token авторизованной сессии
  let accessToken = supabaseKey;
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      accessToken = data.session.access_token;
    }
  } catch (e) {
    console.warn('[PhotoCapture] getSession failed, using anon key:', e.message);
  }

  const url = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'true',
        'cache-control': '3600',
      },
      body: blob,
      signal: controller.signal,
    });

    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!response.ok) {
      throw new Error(json.message || json.error || `HTTP ${response.status}`);
    }

    return { path: filePath, ...json };
  } finally {
    clearTimeout(timeoutId);
  }
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
  userId = null,
}) => {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
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

  // ─── Валидация окружения ───────────────────────────────
  useEffect(() => {
    if (!supabase) {
      setError('❌ Сервер не настроен. Обратитесь к администратору.');
    } else if (!supabase.storage || typeof supabase.storage.from !== 'function') {
      setError('❌ Хранилище недоступно. Обратитесь к администратору.');
    } else if (!companyId) {
      setError('❌ Не удалось определить компанию');
    }
  }, [companyId]);

  // ─── Уведомления ───────────────────────────────────────
  const showNotification = useCallback(
    (message, type) => {
      if (typeof externalShowNotification === 'function') {
        externalShowNotification(message, type);
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

  // ─── Добавление фото ───────────────────────────────────
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

        const previewUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });

        newPhotos.push({
          preview: previewUrl,
          file,
          uploaded: false,
          url: null,
          name: file.name,
          size: file.size,
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

  // ─── 🔥 ЗАГРУЗКА ОДНОГО ФАЙЛА (SDK + fallback fetch) ───
  const uploadOneFile = useCallback(async (photo, index) => {
    // 1. Сжимаем
    const compressedBlob = await compressImage(photo.file);

    // 2. Путь
    const fileName = generateFileName(index);
    const filePath = `photos/company_${companyId}/app_${applicationId || 'temp'}/material_${materialIndex ?? 0}/${fileName}`;

    // 3. Пытаемся через SDK
    let publicUrl = null;
    let sdkError = null;

    try {
      const uploadPromise = supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, compressedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      const { data: uploadData, error: uploadError } = await uploadWithTimeout(
        uploadPromise,
        UPLOAD_TIMEOUT_MS
      );

      if (uploadError) {
        sdkError = uploadError;
      } else if (uploadData?.path) {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(uploadData.path);

        if (urlData?.publicUrl) {
          publicUrl = urlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('[PhotoCapture] SDK upload failed, will try fallback:', err.message);
      sdkError = err;
    }

    // 4. Если SDK не сработал — fallback через fetch
    if (!publicUrl) {
      try {
        await uploadViaFetch(filePath, compressedBlob);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
        publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
      } catch (fallbackErr) {
        console.error('[PhotoCapture] fetch fallback failed:', fallbackErr);
        throw new Error(
          `SDK: ${sdkError?.message || 'unknown'} | fetch: ${fallbackErr.message}`
        );
      }
    }

    return publicUrl;
  }, [companyId, applicationId, materialIndex]);

  // ─── 🔥 ЗАГРУЗКА ВСЕХ ФОТО ─────────────────────────────
  const uploadPhotos = useCallback(
    async (photosToUpload) => {
      if (!photosToUpload || photosToUpload.length === 0) return [];

      if (!companyId) {
        setError('❌ Не удалось определить компанию');
        showNotification('Не удалось определить компанию', 'error');
        return [];
      }

      if (!supabase) {
        setError('❌ Сервер не настроен');
        showNotification('Ошибка подключения к серверу', 'error');
        return [];
      }

      if (!supabase.storage || typeof supabase.storage.from !== 'function') {
        console.error('[PhotoCapture] supabase.storage broken:', supabase.storage);
        setError('❌ Хранилище недоступно');
        showNotification('Ошибка: хранилище не инициализировано', 'error');
        return [];
      }

      setUploading(true);
      setError(null);

      const uploadedUrls = [];

      for (let i = 0; i < photosToUpload.length; i++) {
        const photo = photosToUpload[i];
        setUploadProgress({
          current: i + 1,
          total: photosToUpload.length,
          fileName: photo.name || `фото #${i + 1}`,
        });

        try {
          const url = await uploadOneFile(photo, i);
          uploadedUrls.push(url);

          if (isMountedRef.current) {
            setPhotos((prev) =>
              prev.map((p) =>
                p.file === photo.file ? { ...p, uploaded: true, url } : p
              )
            );
          }
        } catch (fileErr) {
          console.error(`[PhotoCapture] file #${i + 1} failed:`, fileErr);
          setError(`❌ ${fileErr.message}`);
          showNotification(`Ошибка загрузки: ${fileErr.message}`, 'error');
          setUploading(false);
          setUploadProgress({ current: 0, total: 0, fileName: '' });
          return uploadedUrls;
        }
      }

      if (uploadedUrls.length > 0) {
        showNotification(`✅ Загружено ${uploadedUrls.length} фото`, 'success');
      }

      setUploading(false);
      setUploadProgress({ current: 0, total: 0, fileName: '' });
      return uploadedUrls;
    },
    [companyId, showNotification, uploadOneFile]
  );

  // ─── Подтверждение ─────────────────────────────────────
  const confirmPhotos = useCallback(async () => {
    if (uploading) return;

    const notUploaded = photos.filter((p) => !p.uploaded);

    if (notUploaded.length > 0) {
      const urls = await uploadPhotos(notUploaded);
      if (urls.length === 0) return;
    }

    const finalUrls = photos
      .map((p) => p.url)
      .filter(Boolean);

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
  }, [photos, uploadPhotos, onCapture, onClose, multiple, uploading]);

  // ─── Удаление фото ─────────────────────────────────────
  const removePhoto = useCallback((index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

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
              <>
                <p className="text-gray-400 text-sm mt-1">
                  {uploadProgress.current} / {uploadProgress.total}
                </p>
                {uploadProgress.fileName && (
                  <p className="text-gray-500 text-xs mt-1 max-w-xs truncate">
                    {uploadProgress.fileName}
                  </p>
                )}
              </>
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
              {!photo.uploaded && uploading && (
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