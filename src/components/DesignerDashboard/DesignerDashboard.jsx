// src/components/DesignerDashboard/DesignerDashboard.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import {
  Building2, MessageCircle, FileText, Calendar,
  ArrowRight, FolderOpen, Loader2, Search, Compass,
} from 'lucide-react';

const DesignerDashboard = ({
  user,
  userCompanyId,
  userCompany,
  // eslint-disable-next-line no-unused-vars
  userRole,
  onNavigate,
  showNotification,
  // eslint-disable-next-line no-unused-vars
  language = 'ru',
}) => {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 📥 Загрузка объектов компании
  useEffect(() => {
    const loadObjects = async () => {
      if (!userCompanyId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('objects')
          .select('id, name, address, status, created_at, updated_at')
          .eq('company_id', userCompanyId)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setObjects(data || []);
      } catch (err) {
        console.error('Ошибка загрузки объектов:', err);
        showNotification?.('Не удалось загрузить объекты', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadObjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCompanyId]);

  const filteredObjects = useMemo(() => {
    if (!search.trim()) return objects;
    const q = search.toLowerCase();
    return objects.filter(o =>
      o.name?.toLowerCase().includes(q) ||
      o.address?.toLowerCase().includes(q)
    );
  }, [objects, search]);

  const openObject = (obj) => {
    onNavigate?.('object-hub', { objectId: obj.id });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 page-enter">
      {/* Заголовок */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center text-white">
            <Compass className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Добро пожаловать, {user?.user_metadata?.full_name || 'Проектировщик'}!
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {userCompany || 'Компания'} • Рабочее пространство проектировщика
            </p>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickCard
          icon={<Building2 className="w-6 h-6" />}
          label="Объекты"
          count={objects.length}
          color="from-[#4A6572] to-[#344955]"
          onClick={() => onNavigate?.('objects')}
        />
        <QuickCard
          icon={<MessageCircle className="w-6 h-6" />}
          label="Чаты"
          color="from-[#F9AA33] to-[#F57C00]"
          onClick={() => onNavigate?.('chat')}
        />
        <QuickCard
          icon={<FileText className="w-6 h-6" />}
          label="Документы"
          color="from-blue-500 to-blue-700"
          onClick={() => onNavigate?.('documents')}
        />
        <QuickCard
          icon={<Calendar className="w-6 h-6" />}
          label="Календарь"
          color="from-purple-500 to-purple-700"
          onClick={() => onNavigate?.('calendar')}
        />
      </div>

      {/* Объекты */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#4A6572]" />
            Мои объекты
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск объекта..."
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#4A6572]" />
          </div>
        ) : filteredObjects.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Объектов пока нет</p>
            <p className="text-xs mt-1">Обратитесь к руководителю для добавления объектов</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredObjects.map(obj => (
              <button
                key={obj.id}
                onClick={() => openObject(obj)}
                className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#4A6572] hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#4A6572]">
                      {obj.name}
                    </h3>
                    {obj.address && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        📍 {obj.address}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Обновлён: {new Date(obj.updated_at || obj.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#4A6572] group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const QuickCard = ({ icon, label, count, color, onClick }) => (
  <button
    onClick={onClick}
    className="relative p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all text-left"
  >
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center mb-3`}>
      {icon}
    </div>
    <div className="font-medium text-gray-900 dark:text-white">{label}</div>
    {count !== undefined && count !== null && (
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{count}</div>
    )}
  </button>
);

export default DesignerDashboard;