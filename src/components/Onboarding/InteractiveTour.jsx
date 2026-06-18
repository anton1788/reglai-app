// src/components/Onboarding/InteractiveTour.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: '👋 Добро пожаловать в Реглай PRO!',
    description: 'Давайте проведем вас по основным функциям за 3 минуты. Вы готовы?',
    icon: '🚀',
    action: 'Начать тур',
    position: 'center'
  },
  {
    id: 'create',
    title: '📝 Создание заявки',
    description: 'Создавайте заявки на материалы за 30 секунд. Добавляйте позиции, выбирайте единицы измерения и отправляйте на согласование.',
    icon: '📋',
    position: 'center',
    selector: '[data-nav="create"]',
    tip: 'Нажмите "Создать заявку" в меню'
  },
  {
    id: 'track',
    title: '📊 Отслеживание статуса',
    description: 'Следите за движением заявок: "В работе" → "На складе" → "Получено". Больше никаких потерянных заявок!',
    icon: '🎯',
    position: 'center',
    selector: '[data-nav="inwork"]',
    tip: 'Перейдите в раздел "Мои заявки"'
  },
  {
    id: 'team',
    title: '👥 Пригласите команду',
    description: 'Пригласите коллег и получите месяц бесплатно за каждого нового пользователя!',
    icon: '👥',
    position: 'center',
    selector: '[data-nav="invite"]',
    tip: 'Нажмите "Пригласить сотрудника"'
  },
  {
    id: 'analytics',
    title: '📈 Аналитика в реальном времени',
    description: 'Видите все метрики на одном экране: количество заявок, материалов, эффективность работы.',
    icon: '📊',
    position: 'center',
    selector: '[data-nav="analytics"]',
    tip: 'Перейдите в раздел "Аналитика"'
  },
  {
    id: 'complete',
    title: '🎉 Вы готовы к работе!',
    description: 'Теперь вы знаете основные функции. Начните с создания первой заявки!',
    icon: '✅',
    position: 'center',
    action: 'Начать работу'
  }
];

const InteractiveTour = ({ 
  isOpen, 
  onComplete, 
  onSkip
  // ✅ УДАЛИЛИ onNavigate и userRole (не используются)
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [_progress, setProgress] = useState(0);
  const highlightRef = useRef(null);
  const cardRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [cardStyle, setCardStyle] = useState({});

  useEffect(() => {
    if (isOpen) {
      setProgress((currentStep / (TOUR_STEPS.length - 1)) * 100);
    }
  }, [currentStep, isOpen]);

  // Отслеживаем размер окна
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Функция для вычисления позиции карточки
  const calculateCardPosition = useCallback((elementRect) => {
    const cardWidth = isMobile ? window.innerWidth - 32 : 340;
    const cardHeight = 320;
    const spacing = 16;
    
    let top = elementRect.bottom + spacing;
    let bottom = 'auto';
    let position = 'below';
    
    if (top + cardHeight > window.innerHeight - spacing) {
      top = 'auto';
      bottom = window.innerHeight - elementRect.top + spacing;
      position = 'above';
    }
    
    if ((top !== 'auto' && top + cardHeight > window.innerHeight - spacing) ||
        (bottom !== 'auto' && bottom + cardHeight > window.innerHeight - spacing)) {
      top = '50%';
      bottom = 'auto';
      position = 'center';
    }
    
    let left = '50%';
    let transform = position === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)';
    
    if (elementRect.width < cardWidth && position !== 'center') {
      const elementCenter = elementRect.left + elementRect.width / 2;
      const leftPos = elementCenter - cardWidth / 2;
      if (leftPos > spacing && leftPos + cardWidth < window.innerWidth - spacing) {
        left = `${leftPos}px`;
        transform = 'none';
      }
    }
    
    return { top, bottom, left, transform, position };
  }, [isMobile]);

  // Обновляем позицию карточки при изменении шага
  useEffect(() => {
    if (isOpen && TOUR_STEPS[currentStep]?.selector) {
      const element = document.querySelector(TOUR_STEPS[currentStep].selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('onboarding-highlight');
        highlightRef.current = element;
        
        const rect = element.getBoundingClientRect();
        const newCardStyle = calculateCardPosition(rect);
        setCardStyle(newCardStyle);
      }
    }
    return () => {
      if (highlightRef.current) {
        highlightRef.current.classList.remove('onboarding-highlight');
      }
    };
  }, [isOpen, currentStep, calculateCardPosition]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      const nextStep = currentStep + 1;
      // Если следующий шаг имеет селектор - прокручиваем к элементу
      if (TOUR_STEPS[nextStep]?.selector) {
        const element = document.querySelector(TOUR_STEPS[nextStep].selector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      setCurrentStep(nextStep);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Убираем подсветку
    if (highlightRef.current) {
      highlightRef.current.classList.remove('onboarding-highlight');
    }
    onSkip?.();
  };

  // Функция для получения стрелки
  const getArrowPosition = () => {
    if (cardStyle.position === 'below') return 'top-0 translate-y-[-8px] border-b-gray-200 dark:border-b-gray-700';
    if (cardStyle.position === 'above') return 'bottom-0 translate-y-[8px] border-t-gray-200 dark:border-t-gray-700';
    return 'hidden';
  };

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none" style={{ isolation: 'isolate' }}>
      {/* Затемнение фона */}
      <div 
        className="absolute inset-0 pointer-events-auto"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onClick={handleSkip}
      />
      
      {/* Подсветка элемента */}
      {step?.selector && highlightRef.current && (
        <div 
          className="absolute pointer-events-none transition-all duration-300"
          style={{
            position: 'fixed',
            top: highlightRef.current.getBoundingClientRect().top - 8,
            left: highlightRef.current.getBoundingClientRect().left - 8,
            width: highlightRef.current.getBoundingClientRect().width + 16,
            height: highlightRef.current.getBoundingClientRect().height + 16,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            zIndex: 10001,
          }}
        />
      )}

      {/* Карточка подсказки */}
      <div 
        ref={cardRef}
        className="fixed pointer-events-auto z-[10002] transition-all duration-300"
        style={{
          top: cardStyle.top !== 'auto' ? cardStyle.top : 'auto',
          bottom: cardStyle.bottom !== 'auto' ? cardStyle.bottom : 'auto',
          left: cardStyle.left,
          transform: cardStyle.transform,
        }}
      >
        {/* Стрелка-указатель */}
        <div className={`absolute ${getArrowPosition()} left-1/2 -translate-x-1/2 w-0 h-0 
          border-l-8 border-r-8 border-t-8 border-b-8 border-transparent
          ${cardStyle.position === 'below' ? 'border-b-[#4A6572] dark:border-b-[#F9AA33]' : ''}
          ${cardStyle.position === 'above' ? 'border-t-[#4A6572] dark:border-t-[#F9AA33]' : ''}
        `} />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-[calc(100vw-32px)] max-w-[380px] max-h-[70vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            {/* Заголовок */}
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs sm:text-sm font-bold">{currentStep + 1}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {currentStep + 1} из {TOUR_STEPS.length}
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="p-1.5 min-w-[36px] min-h-[36px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                aria-label="Пропустить тур"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Контент */}
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">
              {step?.title}
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              {step?.description}
            </p>

            {step?.tip && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  💡 {step.tip}
                </p>
              </div>
            )}

            {/* Прогресс-бары */}
            <div className="flex gap-1.5 mb-4">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep 
                      ? 'w-6 bg-[#4A6572]' 
                      : idx < currentStep 
                        ? 'w-3 bg-green-500' 
                        : 'w-3 bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {/* Кнопки */}
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={currentStep === 0 ? handleSkip : handlePrev}
                className="px-3 sm:px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg min-w-[80px] transition-colors"
              >
                {currentStep === 0 ? 'Пропустить' : 'Назад'}
              </button>
              
              <button
                onClick={handleNext}
                className="px-4 sm:px-5 py-2 text-sm bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md flex items-center gap-2 min-w-[100px] justify-center transition-all active:scale-95"
              >
                {isLast ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Готово</span>
                  </>
                ) : (
                  <>
                    <span>Далее</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveTour;