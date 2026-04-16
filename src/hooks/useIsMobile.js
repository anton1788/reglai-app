// src/hooks/useIsMobile.js
import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the screen is mobile size
 * @param {number} breakpoint - Breakpoint in pixels (default: 768)
 * @returns {boolean} - true if screen width is less than breakpoint
 */
export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
};