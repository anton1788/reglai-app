import React, { useState, useMemo } from 'react';
import { DollarSign, FileText, Printer, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const AccountantFinanceDashboard = ({ applications }) => { // ← удалили t
  const [period, setPeriod] = useState('month');
  // setSelectedMonth не используется, удаляем или оставляем с eslint-disable
  // const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  // Временно используем текущий месяц без состояния
  const selectedMonth = new Date().getMonth();
  
  // Фильтруем только выполненные заявки
  const completedApps = applications.filter(a => a.status === 'received');
  
  // Данные по месяцам
  const monthlyData = useMemo(() => {
    const months = {};
    completedApps.forEach(app => {
      const date = new Date(app.created_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth()+1}`;
      const monthName = date.toLocaleString('ru-RU', { month: 'long' });
      
      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthName,
          year: date.getFullYear(),
          total: 0,
          count: 0,
          monthNum: date.getMonth()
        };
      }
      months[monthKey].total += (app.total_amount || 0);
      months[monthKey].count += 1;
    });
    return Object.values(months).sort((a, b) => a.monthNum - b.monthNum);
  }, [completedApps]);
  
  // Данные по объектам
  const objectData = useMemo(() => {
    const objects = {};
    completedApps.forEach(app => {
      if (!objects[app.object_name]) {
        objects[app.object_name] = {
          name: app.object_name,
          total: 0,
          count: 0
        };
      }
      objects[app.object_name].total += (app.total_amount || 0);
      objects[app.object_name].count += 1;
    });
    return Object.values(objects)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [completedApps]);
  
  // Общая статистика
  const totalYear = monthlyData.reduce((sum, m) => sum + m.total, 0);
  const totalApplications = completedApps.length;
  const averageCheck = totalApplications > 0 ? totalYear / totalApplications : 0;
  
  // Рост к прошлому месяцу
  const currentMonthTotal = monthlyData.find(m => m.monthNum === selectedMonth)?.total || 0;
  const prevMonthTotal = monthlyData.find(m => m.monthNum === selectedMonth - 1)?.total || 0;
  const growth = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;
  
  // Цвета для графика
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 page-enter">
      {/* Заголовок */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            Финансовый учёт
          </h1>
          <p className="text-gray-500 mt-1">Отчётность по выполненным заявкам</p>
        </div>
        
        <div className="flex gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="month">За месяц</option>
            <option value="quarter">За квартал</option>
            <option value="year">За год</option>
          </select>
          
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Экспорт
          </button>
        </div>
      </div>
      
      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-5">
          <p className="text-gray-500 text-sm">Годовой оборот</p>
          <p className="text-3xl font-bold text-green-600">{totalYear.toLocaleString()} ₽</p>
          <p className={`text-xs mt-2 flex items-center gap-1 ${growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(growth).toFixed(1)}% к прошлому месяцу
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-5">
          <p className="text-gray-500 text-sm">Выполненных заявок</p>
          <p className="text-3xl font-bold text-blue-600">{totalApplications}</p>
          <p className="text-xs text-gray-500 mt-2">за всё время</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-5">
          <p className="text-gray-500 text-sm">Средний чек</p>
          <p className="text-3xl font-bold text-purple-600">{averageCheck.toLocaleString()} ₽</p>
          <p className="text-xs text-gray-500 mt-2">на одну заявку</p>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-5">
          <p className="text-gray-500 text-sm">Активных объектов</p>
          <p className="text-3xl font-bold text-orange-600">{objectData.length}</p>
          <p className="text-xs text-gray-500 mt-2">с выполненными заявками</p>
        </div>
      </div>
      
      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Динамика расходов */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Динамика расходов по месяцам
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => `${value.toLocaleString()} ₽`} />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Топ объектов по расходам */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <h3 className="font-semibold mb-4">Топ объектов по расходам</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={objectData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K ₽`} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(value) => `${value.toLocaleString()} ₽`} />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Таблица заявок */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b">
          <h3 className="font-semibold">Последние выполненные заявки</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Объект</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Прораб</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Материалов</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {completedApps.slice(0, 10).map(app => (
                <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 text-sm">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium">{app.object_name}</td>
                  <td className="px-6 py-4 text-sm">{app.foreman_name}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    {(app.total_amount || 0).toLocaleString()} ₽
                  </td>
                  <td className="px-6 py-4 text-sm">{app.materials?.length || 0}</td>
                </tr>
              ))}
              {completedApps.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Нет выполненных заявок
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Кнопки экспорта */}
      <div className="flex gap-3 justify-end">
        <button className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Экспорт в Excel
        </button>
        <button className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Печать отчёта
        </button>
      </div>
    </div>
  );
};

export default AccountantFinanceDashboard;