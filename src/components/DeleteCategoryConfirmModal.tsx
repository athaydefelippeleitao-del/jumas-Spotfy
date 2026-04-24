import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface DeleteCategoryConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  categoryName: string;
  songCount: number;
}

export const DeleteCategoryConfirmModal: React.FC<DeleteCategoryConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  categoryName,
  songCount
}) => {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
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
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">{t('categories.deleteTitle')}</h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                {t('categories.deleteConfirm', { name: categoryName })} <br/>
                {songCount > 0 ? (
                  <span className="block mt-2 text-sm bg-bg-secondary p-3 rounded-xl border border-border-color/50">
                    {t('categories.hasSongs', { count: songCount })} {t('categories.hasSongsDesc')}
                  </span>
                ) : (
                  <span className="block mt-2 text-sm">{t('categories.isEmpty')}</span>
                )}
              </p>
              
              <div className="flex w-full gap-4">
                <button 
                  onClick={onClose} 
                  className="flex-1 py-4 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-2xl transition-all font-bold border border-border-color"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all font-bold shadow-lg shadow-red-600/20 active:scale-95"
                >
                  {t('common.confirmDelete')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
