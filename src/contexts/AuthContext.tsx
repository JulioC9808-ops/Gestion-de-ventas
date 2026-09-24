import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { readEmployeeLicense, isEmployeeLicenseActive } from '@/lib/employeeLicense';
import { verifyDevChallengeResponse } from '@/lib/cryptoLicense';

export interface LoginResult {
  ok: boolean;
  reason?: 'invalid' | 'employee-only' | 'requires-dev-otp';
  devUser?: User;
}

interface AuthContextType {
  currentUser: User | null;
  user: User | null;
  login: (username: string, password: string) => boolean;
  loginDetailed: (username: string, password: string) => LoginResult;
  loginWithDevOtp: (challenge: string, otp: string, devUser?: User) => boolean;
  logout: () => void;
  isRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_USERS: User[] = [
  { id: 'dev-1', username: 'DEVJ260208C', password: 'J260208C', name: 'Desarrollador', role: 'dev', createdAt: new Date().toISOString() },
  { id: 'admin-1', username: 'admin', password: 'admin123', name: 'Administrador', role: 'admin', createdAt: new Date().toISOString() },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const getUsers = useCallback((): User[] => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  }, []);

  const loginDetailed = useCallback((username: string, password: string): LoginResult => {
    const users = getUsers();
    // Comparación EXACTA: las mayúsculas y minúsculas importan.
    const u = username.trim();
    const p = password;
    const user = users.find(x => x.username === u && x.password === p);
    if (!user) return { ok: false, reason: 'invalid' };

    // En dispositivos activados con licencia de SOLO EMPLEADO no se permite
    // entrar como administrador ni desarrollador, aunque las credenciales sean correctas.
    if (isEmployeeLicenseActive(readEmployeeLicense()) && user.role !== 'employee') {
      return { ok: false, reason: 'employee-only' };
    }

    // Doble factor de autenticación para Desarrollador (Challenge-Response 100% Offline)
    if (user.role === 'dev') {
      return { ok: false, reason: 'requires-dev-otp', devUser: user };
    }

    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    return { ok: true };
  }, [getUsers]);

  const loginWithDevOtp = useCallback((challenge: string, otp: string, devUser?: User): boolean => {
    if (isEmployeeLicenseActive(readEmployeeLicense())) {
      return false;
    }
    const isValid = verifyDevChallengeResponse(challenge, otp);
    if (isValid) {
      const activeDevUser: User = devUser || {
        id: 'dev-otp-session',
        username: 'DEVJ260208C',
        name: 'Julio_GE (Dev Autorizado)',
        role: 'dev',
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(activeDevUser);
      localStorage.setItem('currentUser', JSON.stringify(activeDevUser));
      return true;
    }
    return false;
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    return loginDetailed(username, password).ok;
  }, [loginDetailed]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  }, []);

  const isRole = useCallback((role: UserRole) => currentUser?.role === role, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, user: currentUser, login, loginDetailed, loginWithDevOtp, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
