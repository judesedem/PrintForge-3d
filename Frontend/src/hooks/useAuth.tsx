// PrintForge 3D — useAuth hook (real API version)
// Drop-in replacement for the mock useAuth.tsx.
// All login/register/logout calls now hit Spring Boot /api/auth/*.

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { apiLogin, apiRegister, apiLogout, apiGetMe, getToken, registerUnauthorizedHandler } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  /** Keep for demo role switcher in ProfileScreen */
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await apiGetMe();
          setUser(me);
        }
      } catch (_) {
        // Token stale — ignore, user will re-login
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { user: me } = await apiLogin(email, password);
      setUser(me);
      return true;
    } catch (e) {
      console.log('[DEBUG] Login failed:', e);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<boolean> => {
    try {
      const { user: me } = await apiRegister(name, email, password, role);
      setUser(me);
      return true;
    } catch (e) {
      console.log('[DEBUG] Register failed:', e);
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  // Demo only — lets ProfileScreen switch roles without a real multi-account flow
  const switchRole = (role: UserRole) => {
    if (user) setUser({ ...user, role });
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, switchRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
