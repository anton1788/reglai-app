// src/hooks/useVoiceRecorder.js
import { useState, useRef, useCallback, useEffect } from 'react';

export const useVoiceRecorder = ({ onRecordingComplete, maxDuration = 60 }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      setError('Ваш браузер не поддерживает запись голоса');
    }
  }, []);

  // ✅ Улучшенная очистка
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Игнорируем ошибки при остановке
        }
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Запись голоса не поддерживается');
      return;
    }

    if (isRecording) {
      console.warn('⚠️ Запись уже идет');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            mimeType = 'audio/ogg;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else {
            mimeType = '';
          }
        }
      }
      
      console.log('🎵 Используемый MIME тип:', mimeType || 'default');
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          console.warn('⚠️ Нет данных для записи');
          setError('Запись не удалась, попробуйте снова');
          return;
        }
        
        const finalMimeType = mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: finalMimeType
        });
        
        if (audioBlob.size === 0) {
          console.warn('⚠️ Пустая запись');
          setError('Запись пустая, попробуйте снова');
          return;
        }
        
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        const extension = finalMimeType.includes('ogg') ? 'ogg' : 
                         finalMimeType.includes('mp4') ? 'mp4' : 'webm';
        
        if (onRecordingComplete) {
          onRecordingComplete({
            url,
            blob: audioBlob,
            duration: recordingDuration,
            name: `голосовое_${Date.now()}.${extension}`,
            mimeType: finalMimeType
          });
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      setError(null);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newDuration;
        });
      }, 1000);
      
    } catch (err) {
      console.error('❌ Ошибка доступа к микрофону:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Доступ к микрофону запрещен. Разрешите доступ в настройках браузера');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Микрофон не найден. Подключите микрофон и попробуйте снова');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Микрофон занят другим приложением. Закройте другие программы и попробуйте снова');
      } else {
        setError('Не удалось получить доступ к микрофону');
      }
      
      setIsRecording(false);
    }
  }, [isSupported, maxDuration, onRecordingComplete, isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } catch (err) {
        console.error('❌ Ошибка остановки записи:', err);
      }
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('❌ Ошибка отмены записи:', err);
      }
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    setRecordingDuration(0);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    audioChunksRef.current = [];
    setError(null);
  }, [audioUrl]);

  const clearAudio = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setError(null);
  }, [audioUrl]);

  const formatDuration = useCallback((seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    recordingDuration,
    audioUrl,
    error,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
    formatDuration
  };
};

export default useVoiceRecorder;