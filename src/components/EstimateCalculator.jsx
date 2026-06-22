// src/components/EstimateCalculator.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { Calculator, Plus, Trash2, Save, Download, X, FileText } from 'lucide-react';

const EstimateCalculator = ({ 
  supabase, 
  companyId, 
  onSave, 
  showNotification 
  // t - удалён, так как не используется
}) => {
  const [items, setItems] = useState([]);
  const [savedEstimates, setSavedEstimates] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 1,
    unit: 'шт',
    price: 0,
    markup: 0
  });
  const [totalMarkup, setTotalMarkup] = useState(0);
  const [estimateName, setEstimateName] = useState('');

  // Загрузка сохранённых смет - обернута в useCallback
  const loadSavedEstimates = useCallback(async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('estimates')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (data) setSavedEstimates(data);
  }, [companyId, supabase]);

  // Эффект с корректными зависимостями
  React.useEffect(() => {
    loadSavedEstimates();
  }, [loadSavedEstimates]); // Теперь зависимость корректна

  const addItem = () => {
    if (!newItem.name.trim() || newItem.price <= 0) {
      showNotification('Заполните название и цену', 'error');
      return;
    }
    setItems([...items, { ...newItem, id: Date.now() }]);
    setNewItem({ name: '', quantity: 1, unit: 'шт', price: 0, markup: 0 });
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const basePrice = item.price * item.quantity;
      const markupAmount = basePrice * (item.markup / 100);
      return sum + basePrice + markupAmount;
    }, 0);
    
    const totalWithMarkup = subtotal * (1 + totalMarkup / 100);
    
    return {
      subtotal,
      totalMarkupAmount: subtotal * (totalMarkup / 100),
      total: totalWithMarkup
    };
  }, [items, totalMarkup]);

  const saveEstimate = async () => {
    if (items.length === 0) {
      showNotification('Добавьте хотя бы одну позицию', 'error');
      return;
    }

    if (!estimateName.trim()) {
      showNotification('Введите название сметы', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('estimates')
        .insert([{
          company_id: companyId,
          name: estimateName.trim(),
          items: items,
          total_markup: totalMarkup,
          subtotal: totals.subtotal,
          total: totals.total,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      
      showNotification('✅ Смета сохранена!', 'success');
      if (onSave) onSave(data[0]);
      
      setItems([]);
      setTotalMarkup(0);
      setEstimateName('');
      await loadSavedEstimates();
      
    } catch (err) {
      console.error('Ошибка сохранения сметы:', err);
      showNotification('Ошибка сохранения: ' + err.message, 'error');
    }
  };

  const exportEstimate = () => {
    let csv = 'Наименование,Кол-во,Ед.,Цена,Наценка,Стоимость\n';
    items.forEach(item => {
      const cost = item.price * item.quantity * (1 + item.markup / 100);
      csv += `${item.name},${item.quantity},${item.unit},${item.price},${item.markup}%,${cost.toFixed(2)}\n`;
    });
    csv += `\nИтого: ${totals.total.toFixed(2)} ₽`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Смета_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('📥 Смета экспортирована', 'success');
  };

  const loadEstimate = (estimate) => {
    setItems(estimate.items);
    setTotalMarkup(estimate.total_markup);
    setEstimateName(estimate.name);
    setShowSaved(false);
    showNotification(`📋 Загружена смета: ${estimate.name}`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calculator className="w-8 h-8 text-[#4A6572]" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Сметный калькулятор
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Сохранённые ({savedEstimates.length})
            </button>
          </div>
        </div>

        {/* Сохранённые сметы */}
        {showSaved && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <h3 className="font-semibold mb-3">Сохранённые сметы</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {savedEstimates.map(est => (
                <div key={est.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">{est.name}</p>
                    <p className="text-sm text-gray-500">{est.items.length} позиций, {est.total.toFixed(2)} ₽</p>
                  </div>
                  <button
                    onClick={() => loadEstimate(est)}
                    className="px-3 py-1 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] text-sm"
                  >
                    Загрузить
                  </button>
                </div>
              ))}
              {savedEstimates.length === 0 && (
                <p className="text-gray-400 text-center py-4">Нет сохранённых смет</p>
              )}
            </div>
          </div>
        )}

        {/* Добавление позиции */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <input
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            placeholder="Наименование материала"
            className="col-span-2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
          <input
            type="number"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
            placeholder="Кол-во"
            min="1"
            className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
          <select
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="шт">шт</option>
            <option value="м">м</option>
            <option value="кг">кг</option>
            <option value="л">л</option>
            <option value="м3">м³</option>
          </select>
          <input
            type="number"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
            placeholder="Цена за ед."
            min="0"
            className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
          <input
            type="number"
            value={newItem.markup}
            onChange={(e) => setNewItem({ ...newItem, markup: Number(e.target.value) })}
            placeholder="Наценка %"
            min="0"
            className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            onClick={addItem}
            className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>

        {/* Список позиций */}
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">№</th>
                <th className="px-4 py-2 text-left">Наименование</th>
                <th className="px-4 py-2 text-right">Кол-во</th>
                <th className="px-4 py-2 text-center">Ед.</th>
                <th className="px-4 py-2 text-right">Цена</th>
                <th className="px-4 py-2 text-right">Наценка</th>
                <th className="px-4 py-2 text-right">Стоимость</th>
                <th className="px-4 py-2 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const cost = item.price * item.quantity * (1 + item.markup / 100);
                return (
                  <tr key={item.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="w-16 text-right px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        min="1"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">{item.unit}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                        className="w-20 text-right px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={item.markup}
                        onChange={(e) => updateItem(item.id, 'markup', Number(e.target.value))}
                        className="w-16 text-right px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {cost.toFixed(2)} ₽
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                    Добавьте материалы в смету
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Итоги */}
        {items.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Название сметы</p>
              <input
                value={estimateName}
                onChange={(e) => setEstimateName(e.target.value)}
                placeholder="Введите название..."
                className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Сумма без наценки</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.subtotal.toFixed(2)} ₽
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Общая наценка</p>
                <input
                  type="number"
                  value={totalMarkup}
                  onChange={(e) => setTotalMarkup(Number(e.target.value))}
                  className="w-16 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-right"
                  min="0"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                +{totals.totalMarkupAmount.toFixed(2)} ₽
              </p>
            </div>
            <div className="bg-gradient-to-r from-[#4A6572] to-[#344955] p-4 rounded-lg text-white">
              <p className="text-sm opacity-80">Итоговая стоимость</p>
              <p className="text-3xl font-bold">
                {totals.total.toFixed(2)} ₽
              </p>
            </div>
          </div>
        )}

        {/* Действия */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={saveEstimate}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Сохранить смету
          </button>
          <button
            onClick={exportEstimate}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Экспорт CSV
          </button>
          <button
            onClick={() => {
              setItems([]);
              setTotalMarkup(0);
              setEstimateName('');
              showNotification('Смета очищена', 'info');
            }}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Очистить
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstimateCalculator;