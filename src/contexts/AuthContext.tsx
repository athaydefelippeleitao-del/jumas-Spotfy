import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email?: string;
  name: string;
  role: 'admin' | 'user';
  city?: string;
  age?: number;
  photoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CACHE_KEY = 'jumas_cached_user';

function saveUserToCache(user: User | null): void {
  if (user) {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_CACHE_KEY);
  }
}

function loadUserFromCache(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializar com usuário do cache (evita flash de tela de login quando offline)
  const [user, setUser] = useState<User | null>(() => loadUserFromCache());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async (retries = 3) => {
      let shouldStopLoading = false;
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          saveUserToCache(data.user);
          shouldStopLoading = true;
        } else if (res.status === 401) {
          // Sem autenticação válida: limpar cache e usuário
          setUser(null);
          saveUserToCache(null);
          shouldStopLoading = true;
        } else {
          console.error('Auth check failed with status', res.status);
          shouldStopLoading = true;
        }
      } catch (error) {
        if (retries > 0) {
          console.warn(`Auth check failed, retrying... (${retries} left)`, error);
          setTimeout(() => checkAuth(retries - 1), 1000);
          return;
        }
        // Offline ou servidor inacessível após retries: manter usuário do cache
        console.warn('Auth check failed after retries. Using cached user:', loadUserFromCache()?.username);
        // Não limpar o user — ele já foi inicializado do cache no useState
        shouldStopLoading = true;
      } finally {
        if (shouldStopLoading) {
          setLoading(false);
        }
      }
    };

    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    saveUserToCache(userData);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      // Limpar sempre, mesmo offline
      setUser(null);
      saveUserToCache(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
