import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  loginCitizen: (phone: string, otp: string, name?: string, email?: string) => Promise<IUser>;
  loginStaff: (phone: string, otp: string) => Promise<IUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginCitizen = async (phone: string, otp: string, name?: string, email?: string) => {
    const res = await authApi.verifyOtp({
      phone,
      otp,
      name,
      email,
      purpose: 'citizen_login',
    });
    setUser(res.user);
    return res.user;
  };

  const loginStaff = async (phone: string, otp: string) => {
    const res = await authApi.verifyOtp({
      phone,
      otp,
      purpose: 'staff_login',
    });
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginCitizen,
        loginStaff,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
