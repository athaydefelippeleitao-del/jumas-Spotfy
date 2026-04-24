import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-500',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          confirmShadow: 'shadow-red-600/20'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          iconColor: 'text-amber-600 dark:text-amber-500',
          confirmBg: 'bg-amber-600 hover:bg-amber-700',
          confirmShadow: 'shadow-amber-600/20'
        };
      default:
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-500',
          confirmBg: 'bg-jumas-green hover:bg-green-700',
          confirmShadow: 'shadow-jumas-green/20'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-bg-elevated rounded-3xl shadow-2xl border border-border-color flex flex-col overflow-hidden"
          >
            <div className="p-6 flex flex-col items-center text-center">
              <div className={`w-16 h-16 ${styles.iconBg} ${styles.iconColor} rounded-full flex items-center justify-center mb-4`}>
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">{title}</h2>
              <div className="text-text-secondary mb-6">
                {message}
              </div>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={onClose} 
                  className="flex-1 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-xl transition-colors font-medium border border-border-color"
                >
                  {cancelLabel}
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-3 ${styles.confirmBg} text-white rounded-xl transition-colors font-medium shadow-md ${styles.confirmShadow}`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
