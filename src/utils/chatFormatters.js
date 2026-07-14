// src/utils/chatFormatters.js

/**
 * Форматирование текста сообщения с поддержкой Markdown
 * Поддерживает: **жирный**, *курсив*, `код`, # заголовок, ~~зачёркнутый~~
 */
export const formatChatMessage = (text) => {
  if (!text) return '';
  
  let formatted = text;
  
  // Экранируем HTML-теги
  formatted = escapeHtml(formatted);
  
  // # Заголовок
  formatted = formatted.replace(/^# (.+)$/gm, '<h4 class="chat-heading">$1</h4>');
  formatted = formatted.replace(/^## (.+)$/gm, '<h5 class="chat-heading">$1</h5>');
  formatted = formatted.replace(/^### (.+)$/gm, '<h6 class="chat-heading">$1</h6>');
  
  // **жирный**
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // *курсив*
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // ~~зачёркнутый~~
  formatted = formatted.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  
  // `код`
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');
  
  // Ссылки (автоматическое определение)
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
  );
  
  // Переносы строк в <br>
  formatted = formatted.replace(/\n/g, '<br />');
  
  return formatted;
};

/**
 * Экранирование HTML-символов
 */
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Получение plain text (без HTML-тегов) для уведомлений
 */
export const stripHtml = (html) => {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

/**
 * Извлечение упоминаний (@username) из текста
 */
export const extractMentions = (text) => {
  if (!text) return [];
  const mentionRegex = /@([^\s]+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  return matches.map(m => m[1]);
};

/**
 * Подсветка упоминаний в тексте (для рендера)
 */
export const highlightMentions = (text, currentUserId) => {
  if (!text) return text;
  
  return text.replace(
    /@([^\s]+)/g,
    (match, username) => {
      // Проверяем, является ли это упоминанием текущего пользователя
      const isCurrentUser = username === currentUserId || 
                           username === 'меня' || 
                           username === 'всех';
      
      return `<span class="mention ${isCurrentUser ? 'mention-self' : 'mention-other'}">${match}</span>`;
    }
  );
};

export default {
  formatChatMessage,
  stripHtml,
  extractMentions,
  highlightMentions,
  escapeHtml
};