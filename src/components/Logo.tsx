import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  animated?: boolean;
  size?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  animated = false, 
  size = 40,
  showText = true
}) => {
  const flameVariants = {
    animate: {
      d: [
        "M50 15 C 40 15, 30 30, 35 45 C 30 40, 25 45, 30 55 C 35 65, 65 65, 70 55 C 75 45, 70 40, 65 45 C 70 30, 60 15, 50 15 Z",
        "M50 12 C 38 12, 28 28, 33 43 C 28 38, 23 43, 28 53 C 33 63, 63 63, 68 53 C 73 43, 68 38, 63 43 C 68 28, 58 12, 50 12 Z",
        "M50 15 C 40 15, 30 30, 35 45 C 30 40, 25 45, 30 55 C 35 65, 65 65, 70 55 C 75 45, 70 40, 65 45 C 70 30, 60 15, 50 15 Z"
      ],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative group">
        {animated && (
          <>
            <motion.div 
              className="absolute inset-0 bg-jumas-green/20 rounded-full blur-2xl"
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute inset-0 bg-jumas-yellow/10 rounded-full blur-xl"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
        <div className="relative overflow-hidden rounded-2xl">
          <img 
            src="/logo.png" 
            alt="JUMAS Logo" 
            width={size} 
            height={size} 
            className="relative z-10 rounded-xl object-contain"
          />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span 
            className="font-black tracking-tighter text-jumas-blue leading-none" 
            style={{ fontSize: size * 0.45 }}
          >
            JUMAS
          </span>
          <span 
            className="font-bold tracking-[0.3em] text-jumas-green leading-none mt-1 uppercase" 
            style={{ fontSize: size * 0.15 }}
          >
            Cancioneiro
          </span>
        </div>
      )}
    </div>
  );
};
