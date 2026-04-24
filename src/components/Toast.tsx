import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
        >
          <div className={`flex items-center gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
            type === 'success' 
              ? 'bg-jumas-green/10 border-jumas-green/20 text-jumas-green' 
              : type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-500'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
          }`}>
            {type === 'success' && <CheckCircle size={20} />}
            {type === 'error' && <AlertCircle size={20} />}
            {type === 'info' && <CheckCircle size={20} />}
            
            <p className="flex-1 text-sm font-bold">{message}</p>
            
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
