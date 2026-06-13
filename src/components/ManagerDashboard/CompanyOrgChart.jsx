import React, { useState } from 'react';
import { Users, UserCheck, UserX, Activity } from 'lucide-react';

const CompanyOrgChart = ({ users, applications }) => {
  const [hoveredUser, setHoveredUser] = useState(null);
  
  const roles = {
    manager: { icon: '👑', label: 'Руководство', color: 'purple', users: [] },
    supply_admin: { icon: '📦', label: 'Снабжение', color: 'blue', users: [] },
    master: { icon: '🔨', label: 'Прорабы', color: 'orange', users: [] },
    foreman: { icon: '🛠️', label: 'Мастера', color: 'orange', users: [] },
    accountant: { icon: '💰', label: 'Бухгалтерия', color: 'green', users: [] },
    client_manager: { icon: '🤝', label: 'Клиентский отдел', color: 'teal', users: [] }
  };
  
  users.forEach(user => {
    if (roles[user.role]) {
      const userApps = applications.filter(a => a.user_id === user.user_id);
      const lastActive = userApps.length > 0 
        ? new Date(Math.max(...userApps.map(a => new Date(a.created_at))))
        : null;
      
      roles[user.role].users.push({ 
        ...user, 
        appsCount: userApps.length,
        lastActive,
        isActive: lastActive && (new Date() - lastActive) < 7 * 24 * 60 * 60 * 1000
      });
    }
  });
  
  const totalEmployees = users.length;
  const activeEmployees = users.filter(u => {
    const userApps = applications.filter(a => a.user_id === u.user_id);
    const lastActive = userApps.length > 0 
      ? new Date(Math.max(...userApps.map(a => new Date(a.created_at))))
      : null;
    return lastActive && (new Date() - lastActive) < 7 * 24 * 60 * 60 * 1000;
  }).length;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-500" />
          Организационная структура
        </h3>
        
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <UserCheck className="w-4 h-4 text-green-500" />
            <span>Активных: {activeEmployees}</span>
          </div>
          <div className="flex items-center gap-1">
            <UserX className="w-4 h-4 text-gray-400" />
            <span>Всего: {totalEmployees}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Object.entries(roles).filter(([, data]) => data.users.length > 0).map(([role, data]) => (
          <div key={role} className={`bg-gradient-to-br from-${data.color}-50 to-gray-50 rounded-xl p-4 border border-${data.color}-100`}>
            <div className="text-2xl mb-2">{data.icon}</div>
            <h4 className="font-semibold text-sm">{data.label}</h4>
            <p className="text-2xl font-bold">{data.users.length}</p>
            
            {/* Прогресс-бар активности */}
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-${data.color}-500 rounded-full transition-all`}
                style={{ width: `${(data.users.filter(u => u.isActive).length / data.users.length) * 100}%` }}
              />
            </div>
            
            {/* Аватарки сотрудников */}
            <div className="mt-3 flex flex-wrap gap-1">
              {data.users.slice(0, 4).map(user => (
                <div
                  key={user.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredUser(user)}
                  onMouseLeave={() => setHoveredUser(null)}
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r from-${data.color}-400 to-${data.color}-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm ${!user.isActive ? 'opacity-50' : ''}`}>
                    {user.full_name?.[0] || user.user_email?.[0] || '?'}
                  </div>
                  
                  {/* Tooltip */}
                  {hoveredUser?.id === user.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-20 shadow-xl">
                      <div className="font-bold">{user.full_name || 'Без имени'}</div>
                      <div className="text-gray-300">{user.appsCount} заявок</div>
                      <div className="text-gray-400 text-[10px]">
                        {user.isActive ? '🟢 Активен' : '⚫ Неактивен'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {data.users.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold">
                  +{data.users.length - 4}
                </div>
              )}
            </div>
            
            {/* Статистика */}
            <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>📊 Заявок:</span>
                <span className="font-medium">{data.users.reduce((sum, u) => sum + u.appsCount, 0)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Легенда */}
      <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">🟢 Активен (был на этой неделе)</span>
          <span className="flex items-center gap-1">⚫ Неактивен (нет активности)</span>
        </div>
        <button className="text-purple-500 hover:text-purple-600">
          <Activity className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CompanyOrgChart;