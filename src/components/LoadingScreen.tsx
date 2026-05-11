import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

export const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [loadingImage, setLoadingImage] = useState("https://i0.wp.com/schoenstatt.org.br/wp-content/uploads/2017/10/Mater-Admirabilis.jpg?fit=400%2C400&ssl=1");

  useEffect(() => {
    // Fetch loading image from server
    const fetchLoadingImage = (retries = 3) => {
      fetch('/api/settings/loading-image')
        .then(res => res.json())
        .then(data => {
          if (data.url) setLoadingImage(data.url);
        })
        .catch(err => {
          if (retries > 0) {
            setTimeout(() => fetchLoadingImage(retries - 1), 1000);
          } else {
            console.error('Error fetching loading image after retries:', err);
          }
        });
    };
    fetchLoadingImage();

    // Progress bar animates quickly — the loading screen exits as soon as auth is done
    const duration = 1500;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + increment;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      className="fixed inset-0 bg-bg-primary flex flex-col items-center z-50 overflow-hidden"
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#1a1a1a]" />
        <img 
          src="https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?auto=format&fit=crop&w=1920&h=1080&blur=50" 
          alt="Background" 
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
      </div>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-jumas-green/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-jumas-green/5 blur-[120px] rounded-full" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full px-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <motion.div 
              className="absolute inset-0 bg-jumas-green/20 blur-3xl rounded-full"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
            <div className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="mb-8 relative"
              >
                <img 
                  src={loadingImage} 
                  alt="Mater Admirabilis" 
                  className="w-32 h-32 rounded-full object-cover border-4 border-jumas-green shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              <Logo size={140} animated={true} className="mb-12 flex-col gap-8" />
            </div>
          </div>
          
          <div className="w-72 mt-8">
            <div className="flex justify-between items-end mb-3">
              <span className="text-[10px] font-bold text-jumas-green tracking-widest uppercase">Sincronizando</span>
              <span className="text-[10px] font-mono text-text-secondary">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 w-full bg-bg-secondary border border-border-color/50 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-jumas-green/80 to-jumas-green shadow-[0_0_10px_rgba(22,138,68,0.4)]"
                style={{ width: `${progress}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              />
            </div>
          </div>
          
          <motion.div 
            className="mt-10 flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-text-primary font-bold text-sm tracking-tight">
              Cancioneiro Digital
            </p>
            <p className="text-text-secondary text-[10px] font-medium tracking-[0.2em] uppercase opacity-60">
              JUMAS BRASIL
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <motion.div 
        className="pb-12 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <div className="flex items-center gap-3 px-4 py-2 bg-bg-secondary/50 backdrop-blur-md border border-border-color/50 rounded-full">
          <div className="w-1.5 h-1.5 bg-jumas-green rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-text-secondary tracking-widest uppercase">Versão 2.5.0</span>
        </div>
      </motion.div>
    </motion.div>
  );
};
