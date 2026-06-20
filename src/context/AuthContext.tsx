import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, passwordHash: string) => Promise<User>;
  register: (name: string, email: string, phone: string, passwordHash: string) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    const token = api.getToken();
    if (token) {
      try {
        const u = await api.getMe();
        setUser(u);
      } catch (err) {
        console.error('Không thể tự động đăng nhập:', err);
        api.clearToken();
        setUser(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, passwordHash: string) => {
    setLoading(true);
    try {
      const u = await api.login({ email, passwordHash });
      setUser(u);
      setLoading(false);
      return u;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (name: string, email: string, phone: string, passwordHash: string) => {
    try {
      const res = await api.register({ name, email, phone, passwordHash });
      return res.message;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    if (!api.getToken()) return null;
    try {
      const u = await api.getMe();
      setUser(u);
      return u;
    } catch (err) {
      console.error('Lỗi khi lấy thông tin mới của người dùng:', err);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được dùng trong AuthProvider');
  }
  return context;
}
