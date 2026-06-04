// src/components/CRMSales/SalesCallReminder.jsx
import React, { useState, useEffect } from 'react';
import { PhoneCall, Clock, CheckCircle, XCircle, Bell } from 'lucide-react';

const SalesCallReminder = ({ clients, onCallCompleted, onSnooze, showNotification }) => {
  const [reminders, setReminders] = useState([]);
  const [dismissedReminders, setDismissedReminders] = useState(new Set());

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const activeReminders = clients.filter(client => {
      if (dismissedReminders.has(client.id)) return false;
      
      if (client.next_call_date === today) {
        if (client.next_call_time) {
          return client.next_call_time >= currentTime;
        }
        return true;
      }
      return false;
    });
    
    setReminders(activeReminders);
  }, [clients, dismissedReminders]);

  const handleDismiss = (clientId) => {
    setDismissedReminders(prev => new Set([...prev, clientId]));
  };

  const handleComplete = async (client) => {
    await onCallCompleted(client.id, 'call_scheduled');
    handleDismiss(client.id);
    showNotification(`Звонок "${client.name}" отмечен как выполненный`, 'success');
  };

  const handleSnooze = async (client, hours = 1) => {
    const newDate = new Date();
    newDate.setHours(newDate.getHours() + hours);
    const nextDate = newDate.toISOString().split('T')[0];
    const nextTime = `${newDate.getHours().toString().padStart(2, '0')}:${newDate.getMinutes().toString().padStart(2, '0')}`;
    
    await onSnooze(client.id, nextDate, nextTime);
    handleDismiss(client.id);
    showNotification(`Напоминание о звонке "${client.name}" отложено на ${hours} час(а)`, 'info');
  };

  if (reminders.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Напоминания о звонках ({reminders.length})
        </span>
      </div>
      
      {reminders.map(client => (
        <div key={client.id} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="text-sm text-orange-600 hover:underline">
                    {client.phone}
                  </a>
                )}
                {client.next_call_time && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {client.next_call_time}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleComplete(client)}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Выполнено
              </button>
              <button
                onClick={() => handleSnooze(client, 1)}
                className="px-3 py-1.5 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5" />
                Через час
              </button>
              <button
                onClick={() => handleDismiss(client.id)}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SalesCallReminder;