// src/components/Chat/ChatExport.jsx
import React, { useState } from 'react';
import { Download, FileText, FileJson, File, X, Loader2 } from 'lucide-react';
import chatExport from '../../utils/chatExport';

const ChatExport = ({ 
  messages, 
  channelName, 
  companyName, 
  onClose,
  className = '' 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState('txt');

  const formats = [
    { id: 'txt', label: 'Текст (.txt)', icon: File },
    { id: 'html', label: 'HTML (.html)', icon: FileText },
    { id: 'json', label: 'JSON (.json)', icon: FileJson },
  ];

  const handleExport = () => {
    if (messages.length === 0) {
      alert('Нет сообщений для экспорта');
      return;
    }

    setIsExporting(true);

    try {
      let content = '';
      let fileName = '';
      let mimeType = '';

      switch (format) {
        case 'txt':
          content = chatExport.toTxt(messages, channelName, companyName);
          fileName = `чат_${channelName}_${new Date().toISOString().split('T')[0]}.txt`;
          mimeType = 'text/plain;charset=utf-8';
          break;
        case 'html':
          content = chatExport.toHtml(messages, channelName, companyName);
          fileName = `чат_${channelName}_${new Date().toISOString().split('T')[0]}.html`;
          mimeType = 'text/html;charset=utf-8';
          break;
        case 'json':
          content = chatExport.toJson(messages, channelName, companyName);
          fileName = `чат_${channelName}_${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json;charset=utf-8';
          break;
        default:
          throw new Error('Неизвестный формат');
      }

      chatExport.download(content, fileName, mimeType);
    } catch (err) {
      console.error('Ошибка экспорта:', err);
      alert('Не удалось экспортировать чат');
    } finally {
      setIsExporting(false);
      onClose?.();
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm w-full ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-[#4A6572]" />
          Экспорт чата
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Экспортировать <strong>{messages.length}</strong> сообщений
      </p>

      <div className="space-y-2 mb-4">
        {formats.map(f => {
          const Icon = f.icon;
          const isActive = format === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#4A6572]/10 dark:bg-[#4A6572]/20 border border-[#4A6572]/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#4A6572]' : 'text-gray-400'}`} />
              <span className={`text-sm ${isActive ? 'text-[#4A6572] dark:text-[#F9AA33] font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                {f.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={isExporting || messages.length === 0}
          className="flex-1 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Экспорт...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Скачать
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};

export default ChatExport;