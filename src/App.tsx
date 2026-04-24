/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Songbook } from './components/Songbook';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Fetch app icon and set as favicon
    const fetchAppIcon = async (retries = 3) => {
      try {
        const res = await fetch('/api/settings/app-icon');
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = data.url;
            
            // Also set apple-touch-icon for mobile
            let appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
            if (!appleLink) {
              appleLink = document.createElement('link');
              appleLink.rel = 'apple-touch-icon';
              document.getElementsByTagName('head')[0].appendChild(appleLink);
            }
            appleLink.href = data.url;
          }
        }
      } catch (error) {
        if (retries > 0) {
          setTimeout(() => fetchAppIcon(retries - 1), 1000);
        } else {
          console.error('Failed to fetch app icon after retries:', error);
        }
      }
    };
    fetchAppIcon();

    // Reduce the loading screen stay to 2 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-text-primary bg-bg-secondary transition-colors duration-300">
      <AnimatePresence mode="wait">
        {isLoading || authLoading ? (
          <LoadingScreen key="loading" />
        ) : !user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 flex flex-col min-h-screen"
          >
            <AuthModal isOpen={true} onClose={() => {}} isFullScreen={true} />
          </motion.div>
        ) : (
          <motion.div 
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex-1 flex flex-col min-h-screen"
          >
            <Songbook />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
