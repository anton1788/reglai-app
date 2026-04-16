// hooks/useTutorial.js
import { useState, useEffect } from 'react';

export const useTutorial = (tutorialId, steps, { enabled = true, onComplete } = {}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (enabled && !isSkipped) {
      const hasSeen = localStorage.getItem(`tutorial_${tutorialId}_seen`);
      if (!hasSeen) {
        setIsVisible(true);
      }
    }
  }, [enabled, isSkipped, tutorialId]);
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleComplete();
    }
  };
  
  const handleComplete = () => {
    localStorage.setItem(`tutorial_${tutorialId}_seen`, 'true');
    setIsVisible(false);
    onComplete?.();
  };
  
  const handleSkip = () => {
    setIsSkipped(true);
    setIsVisible(false);
    localStorage.setItem(`tutorial_${tutorialId}_skipped`, 'true');
  };
  
  const reset = () => {
    localStorage.removeItem(`tutorial_${tutorialId}_seen`);
    localStorage.removeItem(`tutorial_${tutorialId}_skipped`);
    setCurrentStep(0);
    setIsSkipped(false);
    if (enabled) setIsVisible(true);
  };
  
  return {
    isVisible,
    currentStep,
    steps,
    onNext: handleNext,
    onPrev: () => setCurrentStep(s => Math.max(0, s - 1)),
    onSkip: handleSkip,
    onClose: handleComplete,
    reset
  };
};