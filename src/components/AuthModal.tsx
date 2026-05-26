import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Loader2, Shield, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

import { useTranslation } from 'react-i18next';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFullScreen?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, isFullScreen }) => {
  const { t, i18n } = useTranslation();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showAdminField, setShowAdminField] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState("https://i0.wp.com/schoenstatt.org.br/wp-content/uploads/2017/10/Mater-Admirabilis.jpg?fit=400%2C400&ssl=1");
  
  const { login } = useAuth();

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'recover') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao redefinir a senha');
        
        setError('Senha redefinida com sucesso! Faça login.');
        setAuthMode('login');
        setLoading(false);
        return;
      }

      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login' ? { username, password } : { username, email, password, name, adminCode };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('common.authError'));
      }

      login(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={isFullScreen ? "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden" : "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"}>
          {/* Background Image with Overlay (Same as LoadingScreen) */}
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

          {!isFullScreen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10"
            />
          )}
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-bg-primary/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/10 flex flex-col overflow-hidden z-20"
          >
            <div className="p-8 flex flex-col items-center gap-6 relative">
              {/* Language Toggle in Auth */}
              <div className="absolute top-8 right-8 flex items-center bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => i18n.changeLanguage('pt')}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${
                    (i18n.language || 'es').startsWith('pt')
                      ? 'bg-jumas-green text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  PT
                </button>
                <button
                  type="button"
                  onClick={() => i18n.changeLanguage('es')}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${
                    (i18n.language || 'es').startsWith('es')
                      ? 'bg-jumas-green text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  ES
                </button>
              </div>

              {authMode !== 'login' && (
                <button 
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="absolute top-8 left-8 p-2 text-text-secondary hover:text-jumas-green transition-colors bg-white/5 rounded-full"
                  title="Voltar para o login"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
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
                    className="mb-6 relative"
                  >
                    <img 
                      src={loadingImage} 
                      alt="Mater Admirabilis" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-jumas-green shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <Logo size={80} animated={true} className="flex-col gap-4" />
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-black text-text-primary tracking-tight">
                  {authMode === 'login' ? t('auth.welcomeBack', { defaultValue: 'Bem-vindo de volta' }) 
                   : authMode === 'recover' ? 'Recuperar Senha' 
                   : t('auth.createAccount', { defaultValue: 'Crie sua conta' })}
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  {authMode === 'login' ? t('auth.loginSubtitle', { defaultValue: 'Entre para acessar o Cancioneiro' }) 
                   : authMode === 'recover' ? 'Insira seus dados para criar uma nova senha' 
                   : t('auth.registerSubtitle', { defaultValue: 'Faça parte da nossa comunidade' })}
                </p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-4">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold uppercase tracking-wider text-center"
                >
                  {error}
                </motion.div>
              )}

              {authMode === 'register' && (
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 ml-1">{t('profile.name')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                      <User size={18} />
                    </div>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="w-full bg-bg-secondary/50 border border-white/5 text-text-primary rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                      placeholder={t('profile.name')} 
                      required={authMode === 'register'}
                    />
                  </div>
                </div>
              )}

              {(authMode === 'register' || authMode === 'recover') && (
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 ml-1">{t('profile.email')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                      <Mail size={18} />
                    </div>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="w-full bg-bg-secondary/50 border border-white/5 text-text-primary rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                      placeholder="seu@email.com" 
                      required={authMode === 'register' || authMode === 'recover'}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 ml-1">{t('profile.username')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                    <User size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="w-full bg-bg-secondary/50 border border-white/5 text-text-primary rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                    placeholder={t('profile.username')} 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 ml-1">
                  {authMode === 'recover' ? 'Nova Senha' : t('profile.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full bg-bg-secondary/50 border border-white/5 text-text-primary rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                    placeholder="••••••••" 
                    required 
                    minLength={6}
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminField(!showAdminField)}
                    className="text-[10px] font-bold text-jumas-green hover:underline flex items-center gap-1 uppercase tracking-widest"
                  >
                    <Shield size={14} />
                    {showAdminField ? t('auth.hideAdminCode', { defaultValue: 'Ocultar código administrativo' }) : t('auth.showAdminCode', { defaultValue: 'Criar conta administrativa?' })}
                  </button>
                  
                  {showAdminField && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2"
                    >
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 ml-1 tracking-widest">{t('auth.adminCode', { defaultValue: 'Código de Administrador' })}</label>
                      <input 
                        type="password" 
                        value={adminCode} 
                        onChange={e => setAdminCode(e.target.value)} 
                        className="w-full bg-bg-secondary/50 border border-white/5 text-text-primary rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                        placeholder={t('auth.secretCodePlaceholder', { defaultValue: 'Insira o código secreto' })} 
                      />
                    </motion.div>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-4 py-4 bg-gradient-to-r from-jumas-green/80 to-jumas-green text-white rounded-2xl hover:shadow-[0_0_20px_rgba(22,138,68,0.4)] transition-all font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('common.wait', { defaultValue: 'Aguarde...' })}
                  </>
                ) : (
                  authMode === 'login' ? t('auth.login') 
                  : authMode === 'recover' ? 'Redefinir Senha' 
                  : t('auth.register')
                )}
              </button>

              <div className="mt-6 text-center flex flex-col gap-4">
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('recover');
                      setError('');
                    }}
                    className="text-[10px] text-text-secondary hover:text-jumas-green transition-colors font-bold uppercase tracking-widest"
                  >
                    Esqueceu a senha?
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setError('');
                  }}
                  className="text-xs text-text-secondary hover:text-jumas-green transition-colors font-bold uppercase tracking-widest"
                >
                  {authMode === 'login' ? t('auth.noAccount', { defaultValue: 'Não tem uma conta? Cadastre-se' }) 
                   : t('auth.hasAccount', { defaultValue: 'Já tem uma conta? Entre' })}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
