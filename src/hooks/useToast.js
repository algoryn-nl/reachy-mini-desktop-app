import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for toast notifications
 * 
 * @returns {Object} Toast state and controls
 * @returns {Object} return.toast - Toast state { open, message, severity }
 * @returns {number} return.toastProgress - Progress bar percentage (0-100)
 * @returns {Function} return.showToast - Show toast with message and severity
 * @returns {Function} return.handleCloseToast - Close toast
 * 
 * @example
 * const { toast, toastProgress, showToast, handleCloseToast } = useToast();
 * 
 * // Show success toast
 * showToast('Update completed!', 'success');
 * 
 * // Show error toast
 * showToast('Connection failed', 'error');
 */
export function useToast() {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [toastProgress, setToastProgress] = useState(100);
  
  const showToast = useCallback((message, severity = 'info') => {
    setToast({ open: true, message, severity });
    setToastProgress(100);
  }, []);
  
  const handleCloseToast = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }));
    setToastProgress(100);
  }, []);
  
  // ✅ OPTIMIZED: Progress bar animation using requestAnimationFrame
  useEffect(() => {
    if (!toast.open) {
      setToastProgress(100);
      return;
    }
    
    setToastProgress(100);
    const duration = 3500; // Matches autoHideDuration
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.max(0, 100 - (elapsed / duration) * 100);
      
      setToastProgress(progress);
      
      if (progress > 0 && elapsed < duration) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [toast.open]);
  
  return {
    toast,
    toastProgress,
    showToast,
    handleCloseToast,
  };
}

