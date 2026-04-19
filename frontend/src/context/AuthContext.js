import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (token) => {
    try {
      const res  = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setUser(json.user);
        return json.user;
      } else {
        localStorage.removeItem('ef_token');
        setUser(null);
      }
    } catch (_) {
      localStorage.removeItem('ef_token');
      setUser(null);
    }
    return null;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ef_token');
    if (token) {
      fetchMe(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Login failed');
    localStorage.setItem('ef_token', json.token);
    setUser(json.user);
    return json.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res  = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, email, password }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Registration failed');
    localStorage.setItem('ef_token', json.token);
    setUser(json.user);
    return json.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ef_token');
    setUser(null);
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setUser(prev => prev ? { ...prev, settings: { ...prev.settings, ...newSettings } } : prev);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('ef_token');
    if (token) await fetchMe(token);
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateSettings, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};