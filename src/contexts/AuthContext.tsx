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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async (retries = 3) => {
      let shouldStopLoading = false;
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          shouldStopLoading = true;
        } else if (res.status === 401) {
          // Explicit unauthorized, no need to retry
          setUser(null);
          shouldStopLoading = true;
        } else {
          // Other error status, log and stop
          console.error('Auth check failed with status', res.status);
          shouldStopLoading = true;
        }
      } catch (error) {
        if (retries > 0) {
          console.warn(`Auth check failed, retrying... (${retries} left)`, error);
          setTimeout(() => checkAuth(retries - 1), 1000);
          return;
        }
        console.error('Auth check failed after retries', error);
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
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
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
