// ============================================
// components/Mobile/QRScanner.jsx
// Компонент для сканирования QR-кодов материалов (мобильная версия)
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

// Динамический импорт jsQR как fallback
let jsQR;
const loadJsQR = async () => {
  if (!jsQR) {
    try {
      const module = await import('jsqr');
      jsQR = module.default;
    } catch (err) {
      console.warn('jsQR not available:', err);
    }
  }
  return jsQR;
};

const QRScanner = ({ 
  onScan, 
  onClose, 
  applicationId,
  companyId,
  language = 'ru'
}) => {
  const [error, setError] = useState(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const isScanningRef = useRef(true);
  const isMountedRef = useRef(true);
  
  const t = useCallback((key) => {
    const translations = {
      'scan_qr': { ru: 'Сканировать QR-код', en: 'Scan QR Code' },
      'close': { ru: 'Закрыть', en: 'Close' },
      'error_camera': { ru: 'Не удалось получить доступ к камере', en: 'Cannot access camera' },
      'error_qr': { ru: 'Ошибка сканирования QR-кода', en: 'QR scan error' },
      'error_permission': { ru: 'Доступ к камере запрещён', en: 'Camera permission denied' },
      'error_not_found': { ru: 'Камера не найдена', en: 'Camera not found' },
      'error_format': { ru: 'Неверный формат QR-кода', en: 'Invalid QR format' },
      'scanning': { ru: 'Сканирование...', en: 'Scanning...' },
      'align_qr': { ru: 'Наведите камеру на QR-код', en: 'Align QR code in frame' },
      'retry': { ru: 'Попробовать снова', en: 'Retry' },
      'scan_success': { ru: 'QR-код успешно отсканирован!', en: 'QR code scanned successfully!' }
    };
    return translations[key]?.[language] || key;
  }, [language]);
  
  // Валидация формата отсканированного QR-кода
  const validateQRFormat = useCallback((rawValue) => {
    if (!rawValue) return false;
    
    // Поддерживаемые форматы:
    // 1. material:НАЗВАНИЕ:КОЛИЧЕСТВО:ЕД_ИЗМ
    // 2. НАЗВАНИЕ|КОЛИЧЕСТВО|ЕД_ИЗМ
    // 3. JSON формат
    
    const materialMatch = rawValue.match(/material:([^:]+):(\d+):(.+)/i);
    if (materialMatch) return true;
    
    const parts = rawValue.split('|');
    if (parts.length >= 3 && parts[0]?.trim().length > 0 && !isNaN(parts[1]) && Number(parts[1]) > 0) {
      return true;
    }
    
    try {
      const json = JSON.parse(rawValue);
      if (json.name && json.quantity && json.unit) return true;
    } catch {
      // Не JSON - игнорируем
    }
    
    return false;
  }, []);
  
  // Парсинг QR-кода в единый формат
  const parseQRData = useCallback((rawValue) => {
    // Формат 1: material:НАЗВАНИЕ:КОЛИЧЕСТВО:ЕД_ИЗМ
    const materialMatch = rawValue.match(/material:([^:]+):(\d+):(.+)/i);
    if (materialMatch) {
      return {
        name: materialMatch[1].trim(),
        quantity: parseInt(materialMatch[2]),
        unit: materialMatch[3].trim()
      };
    }
    
    // Формат 2: НАЗВАНИЕ|КОЛИЧЕСТВО|ЕД_ИЗМ
    const parts = rawValue.split('|');
    if (parts.length >= 3) {
      return {
        name: parts[0].trim(),
        quantity: parseInt(parts[1]),
        unit: parts[2].trim()
      };
    }
    
    // Формат 3: JSON
    try {
      const json = JSON.parse(rawValue);
      return {
        name: json.name || json.material_name,
        quantity: parseInt(json.quantity) || 1,
        unit: json.unit || 'шт'
      };
    } catch {
      return null;
    }
  }, []);
  
  // Останавливаем сканирование и освобождаем ресурсы
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    isScanningRef.current = false;
    setCameraInitialized(false);
  }, []);
  
  // Сохранение QR-кода в БД
  const saveQRCodeToDB = useCallback(async (qrData, parsedData) => {
    if (!companyId && !applicationId) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Проверяем, существует ли уже такой QR-код
      const { data: existing } = await supabase
        .from('material_qr_codes')
        .select('id')
        .eq('qr_data', qrData)
        .maybeSingle();
      
      if (!existing) {
        await supabase
          .from('material_qr_codes')
          .insert([{
            material_name: parsedData.name,
            qr_data: qrData,
            application_id: applicationId || null,
            company_id: companyId || null,
            created_by: userData.user?.id,
            used: false
          }]);
      }
    } catch (err) {
      console.error('Save QR error:', err);
    }
  }, [companyId, applicationId]);
  
  // Обработка успешного сканирования
  const handleSuccessfulScan = useCallback(async (rawValue) => {
    if (!isMountedRef.current) return;
    
    const parsedData = parseQRData(rawValue);
    if (!parsedData) {
      setError(t('error_format'));
      setTimeout(() => setError(null), 2000);
      return;
    }
    
    // Сохраняем QR-код в БД
    await saveQRCodeToDB(rawValue, parsedData);
    
    setScanResult(rawValue);
    
    // Вызываем колбэк с результатом
    onScan?.({
      type: 'material',
      name: parsedData.name,
      quantity: parsedData.quantity,
      unit: parsedData.unit,
      rawData: rawValue
    });
    
    // Закрываем сканер через 1.5 секунды
    setTimeout(() => {
      if (isMountedRef.current) {
        onClose?.();
      }
    }, 1500);
  }, [onScan, onClose, t, parseQRData, saveQRCodeToDB]);
  
  // Используем Web Barcode Detector API
  const scanWithWebAPI = useCallback(async () => {
    isScanningRef.current = true;
    setCameraInitialized(false);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise((resolve, reject) => {
          videoRef.current.onloadedmetadata = () => {
            if (isMountedRef.current) {
              videoRef.current.play().then(resolve).catch(reject);
            } else {
              reject(new Error('Unmounted'));
            }
          };
          videoRef.current.onerror = reject;
        });
        
        if (!isMountedRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setCameraInitialized(true);
        
        // Используем BarcodeDetector если доступен
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new BarcodeDetector({ 
            formats: ['qr_code'] 
          });
          
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
          }
          
          scanIntervalRef.current = setInterval(async () => {
            if (!isMountedRef.current || !videoRef.current || !canvasRef.current || !isScanningRef.current) {
              return;
            }
            
            if (videoRef.current.videoWidth > 0 && videoRef.current.readyState === 4) {
              const canvas = canvasRef.current;
              const context = canvas.getContext('2d');
              
              if (canvas.width !== videoRef.current.videoWidth) {
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
              }
              
              context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              
              try {
                const barcodes = await barcodeDetector.detect(canvas);
                
                if (!isMountedRef.current || !isScanningRef.current) return;
                
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  if (validateQRFormat(barcodes[0].rawValue)) {
                    isScanningRef.current = false;
                    stopScanning();
                    await handleSuccessfulScan(barcodes[0].rawValue);
                  }
                }
              } catch (detectErr) {
                console.error('Detection error:', detectErr);
              }
            }
          }, 300);
        } else {
          // Fallback на jsQR
          const jsqrLib = await loadJsQR();
          
          if (jsqrLib) {
            scanIntervalRef.current = setInterval(() => {
              if (!isMountedRef.current || !videoRef.current || !canvasRef.current || !isScanningRef.current) {
                return;
              }
              
              if (videoRef.current.videoWidth > 0 && videoRef.current.readyState === 4) {
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                
                if (canvas.width !== videoRef.current.videoWidth) {
                  canvas.width = videoRef.current.videoWidth;
                  canvas.height = videoRef.current.videoHeight;
                }
                
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsqrLib(imageData.data, canvas.width, canvas.height);
                
                if (code && code.data && isScanningRef.current) {
                  if (validateQRFormat(code.data)) {
                    isScanningRef.current = false;
                    stopScanning();
                    handleSuccessfulScan(code.data);
                  }
                }
              }
            }, 300);
          } else {
            setError('QR scanner library not available');
          }
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      isScanningRef.current = false;
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(t('error_permission'));
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError(t('error_not_found'));
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Камера уже используется другим приложением');
      } else {
        setError(t('error_camera'));
      }
      
      console.error('Camera error:', err);
    }
  }, [stopScanning, t, validateQRFormat, handleSuccessfulScan]);
  
  // Попробовать переподключить камеру
  const retryCamera = useCallback(() => {
    if (!isMountedRef.current) return;
    setError(null);
    setScanResult(null);
    scanWithWebAPI();
  }, [scanWithWebAPI]);
  
  // Закрытие компонента с очисткой
  const handleClose = useCallback(() => {
    stopScanning();
    onClose?.();
  }, [stopScanning, onClose]);
  
  // Инициализация и очистка
  useEffect(() => {
    isMountedRef.current = true;
    scanWithWebAPI();
    
    return () => {
      isMountedRef.current = false;
      stopScanning();
    };
  }, [scanWithWebAPI, stopScanning]);
  
  // Обработка клавиши Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMountedRef.current) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label={t('scan_qr')}
    >
      <div className="relative w-full max-w-md mx-auto px-4">
        {/* Кнопка закрытия */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full transition-colors shadow-lg"
          aria-label={t('close')}
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>
        
        {/* Заголовок */}
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Camera className="w-4 h-4 text-white" aria-hidden="true" />
            <span className="text-white text-sm font-medium">{t('scan_qr')}</span>
          </div>
        </div>
        
        {error ? (
          // Состояние ошибки
          <div className="text-center p-6 bg-black/50 rounded-xl mx-4 border border-red-500/30">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" aria-hidden="true" />
            <p className="text-white text-lg mb-2 font-medium">{error}</p>
            <p className="text-gray-400 text-sm mb-6">
              {error === t('error_permission') 
                ? 'Проверьте настройки браузера и разрешите доступ к камере'
                : error === t('error_not_found')
                  ? 'Убедитесь, что на устройстве есть камера'
                  : 'Попробуйте ещё раз'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={retryCamera}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                {t('retry')}
              </button>
            </div>
          </div>
        ) : scanResult ? (
          // Состояние успешного сканирования
          <div className="text-center p-6 bg-black/50 rounded-xl mx-4 border border-green-500/30">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <p className="text-white text-lg mb-2 font-medium">{t('scan_success')}</p>
            <p className="text-gray-400 text-sm mb-4 break-all">{scanResult}</p>
          </div>
        ) : (
          <>
            {/* Видео поток */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                className="w-full h-[70vh] object-cover"
                autoPlay
                playsInline
                muted
                aria-hidden="true"
              />
              
              {/* Затемнение по краям + рамка сканирования */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 m-8 bg-transparent border-2 border-blue-500/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-lg" />
              </div>
              
              {/* Угловые маркеры */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/2 pointer-events-none">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-blue-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-blue-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-blue-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-blue-500 rounded-br-lg" />
                
                {/* Анимированная линия сканирования */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" 
                     style={{ animation: 'scanLine 2s ease-in-out infinite' }} />
              </div>
              
              {/* Индикатор загрузки камеры */}
              {!cameraInitialized && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-3" aria-hidden="true" />
                    <p className="text-white">{t('scanning')}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Инструкция */}
            <div className="text-center mt-6 px-4">
              <p className="text-white text-base font-medium">{t('align_qr')}</p>
              <p className="text-gray-400 text-sm mt-2">
                <span className="font-medium">Поддерживаемые форматы:</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">
                <code className="bg-gray-800 px-1 py-0.5 rounded">material:НАЗВАНИЕ:КОЛИЧЕСТВО:ЕД_ИЗМ</code>
              </p>
              <p className="text-gray-500 text-xs mt-1">
                <code className="bg-gray-800 px-1 py-0.5 rounded">НАЗВАНИЕ|КОЛИЧЕСТВО|ЕД_ИЗМ</code>
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Пример: <code className="bg-gray-800 px-1 py-0.5 rounded">Цемент М500|50|кг</code>
              </p>
            </div>
          </>
        )}
      </div>
      
      {/* Скрытый canvas для детекции */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      
      {/* CSS анимация для линии сканирования */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50% { transform: translateY(100%); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(QRScanner);