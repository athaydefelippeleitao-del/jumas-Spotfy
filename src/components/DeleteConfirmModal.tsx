import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  songTitle: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  songTitle 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
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
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Excluir Cifra</h2>
              <p className="text-text-secondary mb-6">
                Tem certeza que deseja excluir a cifra <br/>
                <strong className="text-text-primary">"{songTitle}"</strong>? <br/>
                Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={onClose} 
                  className="flex-1 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-xl transition-colors font-medium border border-border-color"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium shadow-md shadow-red-600/20"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
