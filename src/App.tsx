/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { Songbook } from './components/Songbook';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthModal } from './components/AuthModal';
import { OfflineBanner } from './components/OfflineBanner';
import { useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Fetch app icon and set as favicon (fire and forget)
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
        }
      }
    };
    fetchAppIcon();
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-text-primary bg-bg-secondary transition-colors duration-300">
      <OfflineBanner />
      <AnimatePresence mode="wait">
        {authLoading ? (
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
