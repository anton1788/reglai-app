// src/components/Chat/VoiceRecorder.jsx
import React, { useEffect, useRef } from 'react';
import { Mic, Square, X, Play, Trash2, Loader2 } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';

const VoiceRecorder = ({ 
  onSend, 
  onCancel, 
  maxDuration = 60,
  className = '' 
}) => {
  const {
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
  } = useVoiceRecorder({
    onRecordingComplete: (audio) => {
      // Аудио готово к отправке
      onSend?.(audio);
    },
    maxDuration
  });

  const audioRef = useRef(null);
  const waveformRef = useRef(null);

  // Визуализация звука (простая)
  useEffect(() => {
    if (isRecording && waveformRef.current) {
      const interval = setInterval(() => {
        const bars = waveformRef.current.querySelectorAll('.wave-bar');
        bars.forEach((bar) => {
          const height = 4 + Math.random() * 20;
          bar.style.height = `${height}px`;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  // Очистка аудио при размонтировании
  useEffect(() => {
    return () => clearAudio();
  }, [clearAudio]);

  if (!isSupported) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
        ⚠️ Запись голоса не поддерживается в вашем браузере
      </div>
    );
  }

  // Режим воспроизведения (аудио записано)
  if (audioUrl) {
    return (
      <div className={`flex items-center gap-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}>
        <button
          onClick={() => {
            if (audioRef.current) {
              if (audioRef.current.paused) {
                audioRef.current.play();
              } else {
                audioRef.current.pause();
              }
            }
          }}
          className="p-2 bg-[#4A6572] text-white rounded-full hover:bg-[#344955] transition-colors"
        >
          <Play className="w-4 h-4" />
        </button>
        
        <audio ref={audioRef} src={audioUrl} className="hidden" />
        
        <div className="flex-1">
          <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
            <div className="h-full bg-[#4A6572] rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
        
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDuration(recordingDuration)}
        </span>
        
        <button
          onClick={() => {
            clearAudio();
            onCancel?.();
          }}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Режим записи
  if (isRecording) {
    return (
      <div className={`flex items-center gap-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            {formatDuration(recordingDuration)}
          </span>
        </div>
        
        {/* Визуализация звука */}
        <div ref={waveformRef} className="flex-1 flex items-center gap-0.5 h-8 px-2">
          {Array.from({ length: 20 }).map((_, index) => (
            <div
              key={index}
              className="wave-bar w-1 bg-red-400 rounded-full transition-all duration-75"
              style={{ height: '8px' }}
            />
          ))}
        </div>
        
        <button
          onClick={stopRecording}
          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          <Square className="w-4 h-4" />
        </button>
        
        <button
          onClick={cancelRecording}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    );
  }

  // Начальное состояние — кнопка записи
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={startRecording}
        className="p-2.5 bg-[#4A6572] text-white rounded-xl hover:bg-[#344955] transition-all hover:shadow-lg active:scale-95 flex items-center gap-2"
        title="Записать голосовое сообщение"
      >
        <Mic className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Запись</span>
      </button>
      
      {error && (
        <span className="text-xs text-red-500 dark:text-red-400">{error}</span>
      )}
      
      <span className="text-xs text-gray-400">
        макс. {maxDuration} сек
      </span>
    </div>
  );
};

export default VoiceRecorder;