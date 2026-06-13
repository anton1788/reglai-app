import React from 'react';

const QuickActionCard = ({ icon, title, count, onClick, color }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${colors[color]} opacity-0 group-hover:opacity-10 transition-opacity`} />
      <div className="relative p-4">
        <div className={`text-${color}-600 mb-2`}>{icon}</div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-800">{count}</p>
      </div>
    </button>
  );
};

export default QuickActionCard;