import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('ef_token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return; }
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const { data } = await api.get('/auth/me');
        if (data.success) {
          // Merge any locally cached settings so currency is available immediately
          const cached = localStorage.getItem(`ef_settings_${data.user.id}`);
          if (cached) {
            try {
              const localSettings = JSON.parse(cached);
              data.user.settings = { ...data.user.settings, ...localSettings };
            } catch {}
          }
          setUser(data.user);
        }
      } catch {
        localStorage.removeItem('ef_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('ef_token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setToken(data.token);
      // Restore any cached settings (e.g. currency preference)
      const cached = localStorage.getItem(`ef_settings_${data.user.id}`);
      if (cached) {
        try { data.user.settings = { ...data.user.settings, ...JSON.parse(cached) }; } catch {}
      }
      setUser(data.user);
    }
    return data;
  };

  const register = async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    if (data.success) {
      localStorage.setItem('ef_token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('ef_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  /**
   * updateUser — merges partial updates into user state AND caches settings locally.
   * This ensures currency change in Settings is reflected immediately everywhere.
   */
  const updateUser = (updates) => {
    setUser(prev => {
      const next = { ...prev, ...updates };
      // Cache settings so they survive page refresh
      if (updates.settings && prev?.id) {
        localStorage.setItem(`ef_settings_${prev.id}`, JSON.stringify(next.settings));
      }
      return next;
    });
  };

  // Derived: current currency from user settings (for quick access)
  const currency = user?.settings?.currency || 'INR';

  return (
    <AuthContext.Provider value={{
      user, token, loading, currency,
      login, register, logout, updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);