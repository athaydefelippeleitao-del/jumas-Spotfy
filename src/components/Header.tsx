import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Moon, Sun, LogOut, Search, X, User, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchFocus?: () => void;
  isSearchOpen?: boolean;
  onSearchOpenChange?: (isOpen: boolean) => void;
  onOpenProfile?: () => void;
  onLogoClick?: () => void;
  showSearch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  searchQuery = '', 
  onSearchChange, 
  onSearchFocus, 
  isSearchOpen = false, 
  onSearchOpenChange,
  onOpenProfile,
  onLogoClick,
  showSearch = true
}) => {
  const { t, i18n } = useTranslation();
  const [isDark, setIsDark] = useState(false);
  const { user, logout } = useAuth();
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);

  const handleLanguageSwitch = (lng: string) => {
    if (lng === currentLanguage) return;
    setPendingLanguage(lng);
  };

  const confirmLanguageSwitch = () => {
    if (pendingLanguage) {
      i18n.changeLanguage(pendingLanguage);
      setPendingLanguage(null);
    }
  };

  const currentLanguage = (i18n.language || 'es').split('-')[0];

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <header className="bg-bg-elevated/80 backdrop-blur-md text-text-primary sticky top-0 z-40 border-b border-border-color shadow-sm transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className={`${isSearchOpen ? 'hidden md:flex' : 'flex'} flex-shrink-0 items-center gap-3`}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                onLogoClick?.();
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Logo />
              <span className="hidden sm:inline-block text-text-secondary text-sm font-medium border-l border-border-color pl-3">
                {t('songbook.title')} {t('songbook.cifrado')}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className={`flex-1 transition-all duration-300 ${isSearchOpen ? 'flex' : 'hidden md:flex'}`}>
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  onFocus={() => {
                    onSearchFocus?.();
                    onSearchOpenChange?.(true);
                  }}
                  placeholder={t('songbook.searchPlaceholder')}
                  className="w-full bg-bg-secondary border-none text-text-primary rounded-xl pl-12 pr-10 py-3 focus:outline-none focus:ring-1 focus:ring-jumas-green transition-all text-base font-medium placeholder:text-text-secondary/60"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-secondary hover:text-text-primary"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {showSearch && (
              <button
                onClick={() => {
                  if (isSearchOpen) {
                    onSearchChange?.('');
                  }
                  onSearchOpenChange?.(!isSearchOpen);
                }}
                className="md:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
                aria-label="Toggle search"
              >
                {isSearchOpen ? <X size={20} /> : <Search size={20} />}
              </button>
            )}

            {user && (
              <>
                <div className={`${isSearchOpen ? 'hidden md:flex' : 'hidden md:flex'} items-center gap-3 mr-2`}>
                  <button 
                    onClick={onOpenProfile}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity text-right"
                  >
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-text-primary truncate max-w-[100px] lg:max-w-none">
                      {t('header.welcome', { name: user.name })}
                    </span>
                    {user.role === 'admin' && (
                        <span className="text-[10px] font-bold text-jumas-green uppercase tracking-wider bg-jumas-green/10 px-1.5 py-0.5 rounded">{t('users.role_admin')}</span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-bg-secondary border border-border-color flex items-center justify-center">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={16} className="text-text-secondary" />
                      )}
                    </div>
                  </button>
                  <button 
                    onClick={logout}
                    className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    title={t('auth.logout')}
                  >
                    <LogOut size={18} />
                  </button>
                </div>
                
                <button 
                  onClick={onOpenProfile}
                  className={`${isSearchOpen ? 'hidden' : 'flex md:hidden'} p-1 text-text-secondary hover:text-jumas-green hover:bg-bg-secondary rounded-full transition-colors`}
                  aria-label="Meu Perfil"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-bg-secondary border border-border-color flex items-center justify-center">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                </button>
              </>
            )}
            
            {/* Language Toggle */}
            <div className={`${isSearchOpen ? 'hidden md:flex' : 'flex'} items-center bg-bg-secondary rounded-xl p-1 border border-border-color mr-1`}>
              <button
                onClick={() => handleLanguageSwitch('pt')}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${
                  currentLanguage === 'pt'
                    ? 'bg-jumas-green text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                PT
              </button>
              <button
                onClick={() => handleLanguageSwitch('es')}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${
                  currentLanguage === 'es'
                    ? 'bg-jumas-green text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                ES
              </button>
            </div>

            <button 
              onClick={() => setIsDark(!isDark)}
              className={`${isSearchOpen ? 'hidden md:block' : 'block'} p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-full transition-colors`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {pendingLanguage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-bg-elevated rounded-3xl shadow-2xl p-6 border border-border-color"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-2xl bg-jumas-green/10 text-jumas-green">
                  <Globe size={32} />
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    {t('profile.changeLanguageConfirm')}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {t('profile.changeLanguageDescription', { 
                      language: pendingLanguage === 'pt' ? 'Português' : 'Español' 
                    })}
                  </p>
                </div>

                <div className="flex flex-col w-full gap-2 mt-2">
                  <button
                    onClick={confirmLanguageSwitch}
                    className="w-full py-3 rounded-2xl font-bold text-sm bg-jumas-green text-white hover:bg-jumas-green/90 transition-all"
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    onClick={() => setPendingLanguage(null)}
                    className="w-full py-3 rounded-2xl font-bold text-sm text-text-secondary hover:bg-bg-secondary transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
