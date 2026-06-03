// src/components/ManagerAnalyticsDashboard.jsx
import React, { useMemo } from 'react';
import { TrendingUp, Users, Package, AlertCircle } from 'lucide-react';

const ManagerAnalyticsDashboard = ({ 
  applications, 
  companyUsers, 
  userCompany, 
  currentPlan
}) => {
  
  // Безопасный расчет статистики ТОЛЬКО для своей компании
  const safeStats = useMemo(() => {
    if (!applications || applications.length === 0) {
      return {
        totalApplications: 0,
        totalObjects: 0,
        totalMaterials: 0,
        receivedMaterials: 0,
        completionRate: 0,
        statusCounts: { pending: 0, partial: 0, received: 0, canceled: 0 },
        topObjects: []
      };
    }
    
    const totalApplications = applications.length;
    const totalObjects = new Set(applications.map(a => a.object_name)).size;
    const totalMaterials = applications.reduce((sum, app) => 
      sum + (app.materials?.reduce((s, m) => s + (m.quantity || 0), 0) || 0), 0);
    const receivedMaterials = applications.reduce((sum, app) => 
      sum + (app.materials?.reduce((s, m) => s + (m.received || 0), 0) || 0), 0);
    
    const statusCounts = {
      pending: applications.filter(a => a.status === 'pending' || a.status === 'admin_processing').length,
      partial: applications.filter(a => a.status === 'partial_received').length,
      received: applications.filter(a => a.status === 'received').length,
      canceled: applications.filter(a => a.status === 'canceled').length
    };
    
    // Топ объектов
    const objectMap = {};
    applications.forEach(app => {
      objectMap[app.object_name] = (objectMap[app.object_name] || 0) + 1;
    });
    const topObjects = Object.entries(objectMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalApplications,
      totalObjects,
      totalMaterials,
      receivedMaterials,
      completionRate: totalMaterials > 0 ? Math.round((receivedMaterials / totalMaterials) * 100) : 0,
      statusCounts,
      topObjects
    };
  }, [applications]);
  
  // Функция открытия модалки для менеджера
  const openManagerMetricModal = (title, value, type) => {
    const modalDiv = document.createElement('div');
    modalDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999999;';
    
    let recommendations = '';
    if (type === 'conversion') {
      recommendations = `
        <div style="margin-top:16px;padding:16px;background:#eff6ff;border-radius:12px;">
          <h4 style="font-weight:bold;margin-bottom:8px;">📈 Как повысить конверсию:</h4>
          <ul style="list-style:disc;padding-left:20px;space-y:4px;font-size:14px;">
            <li>Улучшите онбординг новых пользователей</li>
            <li>Настройте автоматические напоминания</li>
            <li>Предложите демо-звонок для активных триалов</li>
          </ul>
        </div>
      `;
    } else if (type === 'churn') {
      recommendations = `
        <div style="margin-top:16px;padding:16px;background:#fef3c7;border-radius:12px;">
          <h4 style="font-weight:bold;margin-bottom:8px;">📉 Как снизить отток:</h4>
          <ul style="list-style:disc;padding-left:20px;font-size:14px;">
            <li>Собирайте обратную связь при отмене подписки</li>
            <li>Предлагайте персональные скидки для удержания</li>
            <li>Улучшите качество поддержки</li>
          </ul>
        </div>
      `;
    }
    
    modalDiv.innerHTML = `
      <div style="background:white;border-radius:24px;max-width:500px;width:90%;padding:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:20px;font-weight:bold;margin:0;">📊 ${title}</h3>
          <button class="close-modal" style="background:none;border:none;font-size:24px;cursor:pointer;color:#9ca3af;">&times;</button>
        </div>
        <div style="background:#f3f4f6;padding:20px;border-radius:16px;text-align:center;">
          <div style="font-size:14px;color:#6b7280;">Текущее значение</div>
          <div style="font-size:48px;font-weight:bold;color:#1f2937;">${value}</div>
        </div>
        ${recommendations}
        <button class="close-modal" style="margin-top:16px;width:100%;padding:12px;background:#4A6572;color:white;border:none;border-radius:12px;cursor:pointer;font-weight:bold;">
          Закрыть
        </button>
      </div>
    `;
    
    const closeModal = () => modalDiv.remove();
    modalDiv.querySelectorAll('.close-modal').forEach(btn => {
      btn.onclick = closeModal;
    });
    document.body.appendChild(modalDiv);
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
        {/* Заголовок с компанией */}
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                📊 Аналитика компании
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {userCompany || 'Ваша компания'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">
                Данные обновлены: {new Date().toLocaleString()}
              </div>
              {currentPlan && (
                <div className="text-xs text-green-600 mt-1">
                  Тариф: {currentPlan.name}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Основные показатели */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{safeStats.totalApplications}</div>
              <div className="text-sm text-gray-600 mt-1">Всего заявок</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{safeStats.totalObjects}</div>
              <div className="text-sm text-gray-600 mt-1">Объектов</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">{safeStats.completionRate}%</div>
              <div className="text-sm text-gray-600 mt-1">Выполнение</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{companyUsers?.length || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Пользователей</div>
            </div>
          </div>
          
          {/* Ключевые метрики - кликабельные */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div 
              onClick={() => openManagerMetricModal('Конверсия из триала', '0%', 'conversion')} 
              className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">📊 Конверсия из триала</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">0%</div>
              <div className="text-xs text-blue-500 mt-2">🔍 Нажмите для деталей</div>
            </div>
            
            <div 
              onClick={() => openManagerMetricModal('Отток клиентов', '0%', 'churn')} 
              className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">📉 Отток клиентов</span>
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">0%</div>
              <div className="text-xs text-blue-500 mt-2">🔍 Нажмите для деталей</div>
            </div>
            
            <div 
              onClick={() => openManagerMetricModal('Активные пользователи', companyUsers?.length || 0, 'users')} 
              className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">👥 Активные пользователи</span>
                <Users className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{companyUsers?.length || 0}</div>
              <div className="text-xs text-blue-500 mt-2">🔍 Нажмите для деталей</div>
            </div>
          </div>
          
          {/* Статусы заявок и топ объектов */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Статусы заявок
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">⏳ В ожидании</span>
                  <span className="font-semibold">{safeStats.statusCounts.pending}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">🟡 Частично получено</span>
                  <span className="font-semibold">{safeStats.statusCounts.partial}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">✅ Получено</span>
                  <span className="font-semibold text-green-600">{safeStats.statusCounts.received}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">❌ Отменено</span>
                  <span className="font-semibold text-red-600">{safeStats.statusCounts.canceled}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Топ объектов
              </h3>
              <div className="space-y-3">
                {safeStats.topObjects.length > 0 ? (
                  safeStats.topObjects.map((obj, idx) => (
                    <div key={obj.name} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                        {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '📍 '}
                        {obj.name.length > 30 ? obj.name.substring(0, 30) + '...' : obj.name}
                      </span>
                      <span className="font-semibold">{obj.count} заявок</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    Нет данных по объектам
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4">
          <div className="text-center text-xs text-gray-400">
            Данные обновлены: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerAnalyticsDashboard;