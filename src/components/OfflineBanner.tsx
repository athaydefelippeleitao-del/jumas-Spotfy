import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  // Mostrar brevemente o "Conexão restaurada" antes de sumir
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestored(false);
    } else if (wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const isVisible = !isOnline || showRestored;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={isOnline ? 'restored' : 'offline'}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white shadow-lg ${
            isOnline
              ? 'bg-emerald-600'
              : 'bg-gray-800 border-b border-gray-700'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi size={15} className="shrink-0" />
              <span>Conexão restaurada</span>
            </>
          ) : (
            <>
              <WifiOff size={15} className="shrink-0 text-amber-400" />
              <span>
                <span className="text-amber-400">Modo offline</span>
                {' — '}
                <span className="font-normal text-gray-300">mostrando dados salvos</span>
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
