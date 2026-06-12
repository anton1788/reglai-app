// src/components/OnboardingTour.jsx
import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

const OnboardingTour = ({ 
  isOpen, 
  onClose, 
  currentStep, 
  totalSteps, 
  onNext, 
  onPrev, 
  onComplete,
  highlights = []
}) => {
  const highlightRef = useRef(null);
  const [cardPosition, setCardPosition] = useState({ top: '50%', left: '50%' });
  const [isMobile, setIsMobile] = useState(false);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Функция для вычисления оптимальной позиции карточки
  const calculateCardPosition = (elementRect, cardWidth, cardHeight, windowWidth, windowHeight) => {
    // Варианты позиционирования
    const options = [
      { top: 'auto', bottom: windowHeight - elementRect.top + 20, left: '50%', transform: 'translateX(-50%)', position: 'below' },
      { top: elementRect.bottom + 20, left: '50%', transform: 'translateX(-50%)', position: 'below' },
      { bottom: windowHeight - elementRect.top + 20, left: '50%', transform: 'translateX(-50%)', position: 'above' },
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'center' }
    ];
    
    // Проверяем каждый вариант
    for (const opt of options) {
      let fits = true;
      
      if (opt.top !== 'auto' && typeof opt.top === 'number') {
        if (opt.top + cardHeight > windowHeight - 20) fits = false;
      }
      if (opt.bottom && typeof opt.bottom === 'number') {
        if (opt.bottom + cardHeight > windowHeight - 20) fits = false;
      }
      if (opt.left === '50%') {
        const leftPos = (windowWidth - cardWidth) / 2;
        if (leftPos < 10 || leftPos + cardWidth > windowWidth - 10) fits = false;
      }
      
      if (fits) return opt;
    }
    
    // Если ничего не подошло — по центру
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'center' };
  };

  useEffect(() => {
    if (isOpen && highlights[currentStep]?.selector) {
      const element = document.querySelector(highlights[currentStep].selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('onboarding-highlight');
        highlightRef.current = element;
        
        // Вычисляем позицию для карточки
        const rect = element.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const cardWidth = Math.min(340, windowWidth - 40);
        const cardHeight = 320;
        
        const position = calculateCardPosition(rect, cardWidth, cardHeight, windowWidth, windowHeight);
        
        setCardPosition({
          top: position.top !== 'auto' ? position.top : 'auto',
          bottom: position.bottom,
          left: position.left,
          transform: position.transform
        });
      }
    }
    return () => {
      if (highlightRef.current) {
        highlightRef.current.classList.remove('onboarding-highlight');
      }
    };
  }, [isOpen, currentStep, highlights]);

  if (!isOpen) return null;

  const step = highlights[currentStep];
  const cardWidth = isMobile ? 'calc(100% - 32px)' : '380px';

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none" style={{ isolation: 'isolate' }}>
      {/* Затемнение фона */}
      <div 
        className="absolute inset-0 pointer-events-auto"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'none'
        }}
      />
      
      {/* Подсветка элемента */}
      {step?.selector && highlightRef.current && (
        <div 
          className="absolute pointer-events-none"
          style={{
            position: 'fixed',
            top: highlightRef.current.getBoundingClientRect().top - 8,
            left: highlightRef.current.getBoundingClientRect().left - 8,
            width: highlightRef.current.getBoundingClientRect().width + 16,
            height: highlightRef.current.getBoundingClientRect().height + 16,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            zIndex: 10001,
            transition: 'all 0.3s ease'
          }}
        />
      )}

      {/* Карточка подсказки */}
      <div 
        className="pointer-events-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
        style={{
          position: 'fixed',
          width: cardWidth,
          maxWidth: 'calc(100% - 32px)',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          top: cardPosition.top !== 'auto' ? cardPosition.top : 'auto',
          bottom: cardPosition.bottom,
          left: cardPosition.left,
          transform: cardPosition.transform,
          zIndex: 10002,
          transition: 'all 0.3s ease'
        }}
      >
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs sm:text-sm font-bold">{currentStep + 1}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentStep + 1} из {totalSteps}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 min-w-[36px] min-h-[36px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 pr-4">
            {step?.title}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            {step?.description}
          </p>

          {step?.actionLabel && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-300 break-words">
                💡 {step.actionLabel}
              </p>
            </div>
          )}

          <div className="flex justify-between items-center gap-3 mt-2">
            <button
              onClick={currentStep === 0 ? onClose : onPrev}
              className="px-3 sm:px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg min-w-[80px] transition-colors"
            >
              {currentStep === 0 ? 'Пропустить' : 'Назад'}
            </button>
            
            <button
              onClick={currentStep === totalSteps - 1 ? onComplete : onNext}
              className="px-4 sm:px-5 py-2 text-sm bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md flex items-center gap-2 min-w-[100px] justify-center transition-all active:scale-95"
            >
              {currentStep === totalSteps - 1 ? (
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
  );
};

export default OnboardingTour;