import React, { createContext, useContext, useState, useEffect } from 'react';
import { AnyRole, AuthSession, Employee, PosSession, Shop, User } from '../types';
import { api, setAuthToken } from '../api';

interface AuthContextType {
  token: string | null;
  role: AnyRole | null;
  user: User | null;
  employee: Employee | null;
  shop: Shop | null;
  session: PosSession | null;
  isImpersonating: boolean;
  superAdminId: string | null;
  impersonationLogId: string | null;
  isLoading: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  loginAdmin: (email: string, pass: string) => Promise<void>;
  loginEmployee: (shopId: string, employeeId: string, pin: string) => Promise<void>;
  switchRole: (targetRole: AnyRole, shopId?: string) => Promise<void>;
  logout: () => Promise<void>;
  startImpersonation: (shopId: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('pos_erp_token'));
  const [role, setRole] = useState<AnyRole | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [session, setSession] = useState<PosSession | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [superAdminId, setSuperAdminId] = useState<string | null>(null);
  const [impersonationLogId, setImpersonationLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveToken = (newToken: string | null) => {
    setTokenState(newToken);
    setAuthToken(newToken);
  };

  const refreshAuth = async () => {
    const curToken = localStorage.getItem('pos_erp_token');
    if (!curToken) {
      setRole(null);
      setUser(null);
      setEmployee(null);
      setShop(null);
      setSession(null);
      setIsImpersonating(false);
      setSuperAdminId(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.auth.getMe();
      if (data.authenticated) {
        setRole(data.role);
        setUser(data.user || null);
        setEmployee(data.employee || null);
        setShop(data.shop || null);
        setSession(data.session || null);
        setIsImpersonating(Boolean(data.isImpersonating));
        setSuperAdminId(data.superAdminId || null);
      } else {
        saveToken(null);
      }
    } catch {
      saveToken(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const loginAdmin = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await api.auth.loginAdmin(email, pass);
      saveToken(data.token);
      setRole(data.role);
      setUser(data.user || null);
      setEmployee(null);
      setShop(data.shop || null);
      setSession(null);
      setIsImpersonating(false);
      setSuperAdminId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loginEmployee = async (shopId: string, employeeId: string, pin: string) => {
    setIsLoading(true);
    try {
      const data = await api.auth.loginEmployee(shopId, employeeId, pin);
      saveToken(data.token);
      setRole(data.role);
      setUser(null);
      setEmployee(data.employee || null);
      setShop(data.shop || null);
      setSession(data.session || null);
      setIsImpersonating(false);
      setSuperAdminId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      saveToken(null);
      setRole(null);
      setUser(null);
      setEmployee(null);
      setShop(null);
      setSession(null);
      setIsImpersonating(false);
      setSuperAdminId(null);
      setImpersonationLogId(null);
      setIsLoading(false);
    }
  };

  const startImpersonation = async (shopId: string) => {
    setIsLoading(true);
    try {
      const data = await api.superAdmin.impersonateShop(shopId);
      saveToken(data.token);
      setRole('SHOP_ADMIN');
      setUser(data.user || null);
      setShop(data.shop || null);
      setEmployee(null);
      setSession(null);
      setIsImpersonating(true);
      setSuperAdminId(data.superAdminId || null);
      setImpersonationLogId(data.impersonationLogId || null);
    } finally {
      setIsLoading(false);
    }
  };

  const exitImpersonation = async () => {
    setIsLoading(true);
    try {
      await api.superAdmin.exitImpersonation(impersonationLogId || undefined);
    } catch {
      // ignore
    } finally {
      // Restore superadmin token or log in as super admin
      try {
        const data = await api.auth.loginAdmin('superadmin@pos-erp.com', 'SuperAdmin123!');
        saveToken(data.token);
        setRole(data.role);
        setUser(data.user || null);
        setShop(null);
        setIsImpersonating(false);
        setSuperAdminId(null);
        setImpersonationLogId(null);
      } catch {
        saveToken(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const switchRole = async (targetRole: AnyRole, shopId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/test/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole, shopId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to switch role');
      saveToken(data.token);
      setRole(data.role);
      setUser(data.user || null);
      setEmployee(data.employee || null);
      setShop(data.shop || null);
      setSession(data.session || null);
      setIsImpersonating(false);
      setSuperAdminId(null);
      setImpersonationLogId(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        user,
        employee,
        shop,
        session,
        isImpersonating,
        superAdminId,
        impersonationLogId,
        isLoading,
        loading: isLoading,
        isAuthenticated: Boolean(token && role),
        loginAdmin,
        loginEmployee,
        switchRole,
        logout,
        startImpersonation,
        exitImpersonation,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
