// src/components/OnboardingTour.jsx
import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (isOpen && highlights[currentStep]?.selector) {
      const element = document.querySelector(highlights[currentStep].selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('onboarding-highlight');
        highlightRef.current = element;
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

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Затемнение фона */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" />
      
      {/* Подсветка элемента */}
      {step?.selector && (
        <div 
          className="absolute pointer-events-none"
          style={{
            inset: '0',
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.6)`,
            borderRadius: '0',
            clipPath: step.selector ? `circle(150px at center)` : 'none'
          }}
        />
      )}

      {/* Карточка подсказки */}
      <div 
        className="absolute pointer-events-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm border border-gray-200/50 dark:border-gray-700/50"
        style={{
          top: step?.position?.top || '50%',
          left: step?.position?.left || '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10001
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">{currentStep + 1}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentStep + 1} из {totalSteps}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {step?.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {step?.description}
        </p>

        {step?.actionLabel && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 {step.actionLabel}
            </p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={currentStep === 0 ? onClose : onPrev}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {currentStep === 0 ? 'Пропустить' : 'Назад'}
          </button>
          
          <button
            onClick={currentStep === totalSteps - 1 ? onComplete : onNext}
            className="px-4 py-2 text-sm bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md flex items-center gap-2"
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Готово
              </>
            ) : (
              <>
                Далее
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;