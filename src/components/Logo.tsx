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
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl relative z-10">
            <defs>
              <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#168a44" />
                <stop offset="100%" stopColor="#0d5a2d" />
              </linearGradient>
              <linearGradient id="redGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e31e24" />
                <stop offset="100%" stopColor="#b1171c" />
              </linearGradient>
              <linearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f9c80e" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
              <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2e3192" />
                <stop offset="100%" stopColor="#1e2163" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="50%" stopColor="white" stopOpacity="0.4" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Green Flag Background */}
            <path d="M15 25 Q 35 15, 50 25 T 85 25 L 85 85 Q 65 95, 50 85 T 15 85 Z" fill="url(#greenGrad)" />
            
            {/* Red Flame */}
            {animated ? (
              <motion.path 
                variants={flameVariants}
                animate="animate"
                fill="url(#redGrad)" 
                filter="url(#glow)"
              />
            ) : (
              <path d="M50 15 C 40 15, 30 30, 35 45 C 30 40, 25 45, 30 55 C 35 65, 65 65, 70 55 C 75 45, 70 40, 65 45 C 70 30, 60 15, 50 15 Z" fill="url(#redGrad)" />
            )}
            
            {/* Yellow Shape */}
            <path d="M20 50 C 20 75, 80 75, 80 50 C 80 45, 70 40, 50 40 C 30 40, 20 45, 20 50 Z" fill="url(#yellowGrad)" />
            <path d="M20 50 C 30 65, 70 65, 80 50 C 70 60, 30 60, 20 50 Z" fill="#fef08a" opacity="0.3" />
            
            <path d="M30 68 L 25 85 L 42 74 Z" fill="url(#yellowGrad)" />
            <path d="M50 72 L 50 92 L 58 72 Z" fill="url(#yellowGrad)" />
            <path d="M70 68 L 75 85 L 58 74 Z" fill="url(#yellowGrad)" />
            
            {/* Blue Globe */}
            <g transform="translate(50, 45)">
              {animated ? (
                <motion.g animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                  <circle cx="0" cy="0" r="14" fill="url(#blueGrad)" />
                  <path d="M-14 0 H 14 M 0 -14 V 14" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  <ellipse cx="0" cy="0" rx="7" ry="14" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  <ellipse cx="0" cy="0" rx="14" ry="7" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8" />
                </motion.g>
              ) : (
                <g>
                  <circle cx="0" cy="0" r="14" fill="url(#blueGrad)" />
                  <path d="M-14 0 H 14 M 0 -14 V 14" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  <ellipse cx="0" cy="0" rx="7" ry="14" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  <ellipse cx="0" cy="0" rx="14" ry="7" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8" />
                </g>
              )}
            </g>

            {/* Shimmer Effect */}
            {animated && (
              <motion.rect
                x="-100"
                y="-100"
                width="300"
                height="300"
                fill="url(#shimmer)"
                animate={{ x: [-150, 150] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
                style={{ transform: 'rotate(45deg)' }}
              />
            )}
          </svg>
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
