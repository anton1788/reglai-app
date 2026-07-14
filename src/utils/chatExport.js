// src/utils/chatExport.js

/**
 * Экспорт чата в различные форматы
 */
export const chatExport = {
  /**
   * Экспорт в TXT
   */
  toTxt: (messages, channelName, companyName) => {
    const header = `Чат: ${channelName}\nКомпания: ${companyName}\nДата: ${new Date().toLocaleDateString('ru-RU')}\n${'='.repeat(50)}\n\n`;
    
    const body = messages.map(msg => {
      const date = new Date(msg.created_at).toLocaleString('ru-RU');
      const sender = msg.user?.user_metadata?.full_name || 'Пользователь';
      const content = msg.content || '';
      return `[${date}] ${sender}:\n${content}\n`;
    }).join('\n');
    
    return header + body;
  },
  
  /**
   * Экспорт в HTML
   */
  toHtml: (messages, channelName, companyName) => {
    const header = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Чат: ${channelName}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f7fa; }
          .header { background: #4A6572; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
          .message { background: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .message-meta { font-size: 12px; color: #666; margin-bottom: 4px; }
          .message-sender { font-weight: bold; color: #4A6572; }
          .message-time { color: #999; }
          .message-content { white-space: pre-wrap; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Чат: ${channelName}</h1>
          <p>Компания: ${companyName} | ${new Date().toLocaleDateString('ru-RU')}</p>
        </div>
    `;
    
    const body = messages.map(msg => {
      const date = new Date(msg.created_at).toLocaleString('ru-RU');
      const sender = msg.user?.user_metadata?.full_name || 'Пользователь';
      const content = msg.content || '';
      return `
        <div class="message">
          <div class="message-meta">
            <span class="message-sender">${sender}</span>
            <span class="message-time">${date}</span>
          </div>
          <div class="message-content">${content}</div>
        </div>
      `;
    }).join('');
    
    const footer = `
        <div class="footer">
          Экспортировано из Реглай PRO • ${new Date().toLocaleString('ru-RU')}
        </div>
      </body>
      </html>
    `;
    
    return header + body + footer;
  },
  
  /**
   * Экспорт в JSON
   */
  toJson: (messages, channelName, companyName) => {
    const data = {
      channel: channelName,
      company: companyName,
      exportedAt: new Date().toISOString(),
      totalMessages: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.user?.user_metadata?.full_name || 'Пользователь',
        senderId: msg.user_id,
        createdAt: msg.created_at,
        editedAt: msg.edited_at,
        replyTo: msg.reply_to_message_id,
        reactions: msg.reactions || []
      }))
    };
    return JSON.stringify(data, null, 2);
  },
  
  /**
   * Скачать файл
   */
  download: (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
};

export default chatExport;