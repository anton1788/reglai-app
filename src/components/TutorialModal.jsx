import React, { useEffect, useRef, useCallback, memo } from 'react';
import { HelpCircle, X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

// ============================================================================
// SUB-COMPONENT: Step Indicator
// ============================================================================

const StepIndicator = memo(({ steps, currentStep, t }) => {
  const safeT = (key, fallback) => (typeof t === 'function' ? t(key) || fallback : fallback);

  return (
    <div className="mb-4" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          aria-hidden="true"
        />
      </div>
      
      {/* Step dots */}
      <div className="flex justify-center items-center gap-2">
        {steps.map((_, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          
          return (
            <div
              key={idx}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600 text-white scale-110 ring-2 ring-indigo-300 dark:ring-indigo-700'
                  : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              aria-label={`${safeT('step', 'Step')} ${idx + 1}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {isCompleted ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : idx + 1}
            </div>
          );
        })}
      </div>
      
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
        {safeT('step', 'Step')} {currentStep + 1} {safeT('of', 'of')} {steps.length}
      </p>
    </div>
  );
});
StepIndicator.displayName = 'StepIndicator';

// ============================================================================
// SUB-COMPONENT: Step Content
// ============================================================================

const StepContent = memo(({ step }) => {
  const content = typeof step === 'object' && step !== null ? step : { description: step };
  
  const renderIcon = () => {
    if (!content.icon) return null;
    
    if (typeof content.icon === 'string') {
      return <img src={content.icon} alt="" className="w-16 h-16 object-contain" aria-hidden="true" />;
    }
    
    if (typeof content.icon === 'function' || React.isValidElement(content.icon)) {
      try {
        return React.isValidElement(content.icon) 
          ? React.cloneElement(content.icon, { className: 'w-12 h-12 text-indigo-600 dark:text-indigo-400', 'aria-hidden': 'true' })
          : null;
      } catch {
        return <span className="text-3xl" aria-hidden="true">{content.icon}</span>;
      }
    }
    
    return null;
  };

  return (
    <div className="animate-fade-in min-h-[140px] flex flex-col items-center justify-center" aria-live="polite">
      {content.icon && (
        <div className="flex justify-center mb-4 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
          {renderIcon()}
        </div>
      )}
      
      {content.title && (
        <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
          {content.title}
        </h3>
      )}
      
      <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed max-w-sm">
        {content.description}
      </p>
      
      {content.image && (
        <div className="mt-4 flex justify-center">
          <img 
            src={content.image} 
            alt={content.imageAlt || ''} 
            className="max-w-full h-48 object-contain rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
          />
        </div>
      )}
    </div>
  );
});
StepContent.displayName = 'StepContent';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TutorialModal = ({ 
  steps = [], 
  currentStep = 0, 
  onNext, 
  onPrev, 
  onSkip, 
  onClose, 
  t,
  allowBackdropClose = true 
}) => {
  const modalRef = useRef(null);
  const safeT = useCallback((key, fallback) => (typeof t === 'function' ? t(key) || fallback : fallback), [t]);
  
  // Normalize steps
  const normalizedSteps = React.useMemo(() => {
    return steps.map(step => {
      if (typeof step === 'string') return { description: step };
      if (typeof step === 'object' && step !== null) return { ...step };
      return { description: String(step) };
    });
  }, [steps]);
  
  const isLastStep = currentStep >= normalizedSteps.length - 1;
  const isFirstStep = currentStep <= 0;
  const currentStepData = normalizedSteps[currentStep] || { description: '' };

  // Debug logging
  useEffect(() => {
    console.log('[TutorialModal] Render:', { 
      currentStep, 
      totalSteps: normalizedSteps.length,
      isFirstStep, 
      isLastStep,
      hasNext: typeof onNext === 'function',
      hasPrev: typeof onPrev === 'function',
      hasClose: typeof onClose === 'function'
    });
  }, [currentStep, normalizedSteps.length, isFirstStep, isLastStep, onNext, onPrev, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        console.log('[TutorialModal] ESC pressed, calling onClose');
        onClose?.();
        return;
      }
      if (e.key === 'ArrowRight' && !isLastStep) {
        e.preventDefault();
        console.log('[TutorialModal] ArrowRight pressed, calling onNext');
        onNext?.();
      }
      if (e.key === 'ArrowLeft' && !isFirstStep) {
        e.preventDefault();
        console.log('[TutorialModal] ArrowLeft pressed, calling onPrev');
        onPrev?.();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
      modal.querySelector('button')?.focus();
    }, 100);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isLastStep, isFirstStep, onClose, onNext, onPrev]);

  const handleBackdropClick = useCallback((e) => {
    if (allowBackdropClose && e.target === e.currentTarget) {
      console.log('[TutorialModal] Backdrop clicked, calling onClose');
      onClose?.();
    }
  }, [allowBackdropClose, onClose]);

  // FIXED: Button handlers with explicit logging
  const handleNext = useCallback(() => {
    console.log('[TutorialModal] handleNext called', { isLastStep, currentStep });
    if (isLastStep) {
      console.log('[TutorialModal] Last step, calling onClose');
      onClose?.();
    } else {
      console.log('[TutorialModal] Not last step, calling onNext');
      onNext?.();
    }
  }, [isLastStep, onNext, onClose, currentStep]);

  const handlePrev = useCallback(() => {
    console.log('[TutorialModal] handlePrev called', { isFirstStep, currentStep });
    if (!isFirstStep) {
      console.log('[TutorialModal] Not first step, calling onPrev');
      onPrev?.();
    } else {
      console.log('[TutorialModal] Already on first step');
    }
  }, [isFirstStep, onPrev, currentStep]);

  const handleSkip = useCallback(() => {
    console.log('[TutorialModal] handleSkip called, calling onSkip');
    onSkip?.();
  }, [onSkip]);

  // Guard clause
  if (!normalizedSteps.length || currentStep < 0 || currentStep >= normalizedSteps.length) {
    console.warn('[TutorialModal] Invalid props, rendering null');
    return null;
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg 
                   animate-scale-in ring-1 ring-black/5 dark:ring-white/10"
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            </div>
            <h2 id="tutorial-title" className="text-lg font-bold text-gray-900 dark:text-white">
              {currentStepData.title || safeT('tutorialWelcome', 'Tutorial')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              console.log('[TutorialModal] Close button (X) clicked');
              onClose?.();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={safeT('closeTutorial', 'Close')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <StepIndicator steps={normalizedSteps} currentStep={currentStep} t={t} />
          <StepContent step={currentStepData} />
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            type="button"
            onClick={handleSkip}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg"
            aria-label={safeT('skipTutorial', 'Skip')}
          >
            {safeT('skipTutorial', 'Skip')}
          </button>
          
          <div className="flex items-center gap-2">
            {/* BACK BUTTON */}
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                data-testid="tutorial-back-button"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 
                         dark:text-gray-300 dark:hover:text-white bg-gray-100 hover:bg-gray-200 
                         dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors 
                         flex items-center gap-1 cursor-pointer"
                aria-label={safeT('previousStep', 'Previous')}
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{safeT('back', 'Back')}</span>
              </button>
            )}
            
            {/* NEXT/FINISH BUTTON */}
            <button
              type="button"
              onClick={handleNext}
              data-testid={isLastStep ? "tutorial-finish-button" : "tutorial-next-button"}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                isLastStep 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
              }`}
              aria-label={isLastStep ? safeT('finishTutorial', 'Finish') : safeT('nextStep', 'Next')}
            >
              <span>{isLastStep ? safeT('finishTutorial', 'Finish') : safeT('nextStep', 'Next')}</span>
              {!isLastStep && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
              {isLastStep && <CheckCircle className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(TutorialModal);