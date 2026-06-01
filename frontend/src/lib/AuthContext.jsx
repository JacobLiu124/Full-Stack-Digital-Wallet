import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('wallet_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await getMe();
      setUser(data.user);
    } catch {
      localStorage.removeItem('wallet_token');
      localStorage.removeItem('wallet_user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = (token, userData) => {
    localStorage.setItem('wallet_token', token);
    localStorage.setItem('wallet_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('wallet_token');
    localStorage.removeItem('wallet_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await getMe();
      setUser(data.user);
      return data.user;
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
