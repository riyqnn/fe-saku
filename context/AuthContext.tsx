"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter untuk navigasi
import { useAuth as useAuthHook } from '@/hooks/useAuth';

interface UserData {
  id: string;
  phone: string;
}

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, otp: string) => Promise<any>;
  logout: () => void;
  requestOTP: (phone: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter(); // Inisialisasi router
  const { verifyOTP, requestOTP: hookRequestOTP, isLoading: hookLoading } = useAuthHook();
  const [user, setUser] = useState<UserData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const isOnboarded = localStorage.getItem('isOnboarded');
        const walletAddress = localStorage.getItem('walletAddress');
        const phoneNumber = localStorage.getItem('phoneNumber');

        if (isOnboarded === 'true' && walletAddress) {
          setUser({
            id: 'wallet-' + walletAddress,
            phone: phoneNumber || '',
          });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsInitialized(true);
      }
    };
    checkAuth();
  }, []);

  const login = async (phone: string, otp: string) => {
    const result = await verifyOTP(phone, otp);
    if (result.success) {
      setUser({
        id: 'wallet-' + result.walletAddress,
        phone: result.user.phone,
      });
    }
    return result;
  };

  // FUNGSI LOGOUT YANG DIPERBAIKI
  const logout = () => {
    // 1. Bersihkan data spesifik dari localStorage
    localStorage.removeItem('isOnboarded');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('privateKey');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('walletCreatedAt');

    // 2. Update state user menjadi null secara instan
    setUser(null);

    // 3. Arahkan ke /get-started dan hapus history agar tidak bisa klik 'Back'
    router.replace('/get-started');
  };

  const requestOTP = async (phone: string) => {
    return await hookRequestOTP(phone);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading: !isInitialized || hookLoading,
      login, 
      logout,
      requestOTP 
    }}>
      {/* Loading overlay saat inisialisasi awal untuk mencegah glitch visual */}
      {!isInitialized ? (
        <div className="min-h-screen bg-[#F9EFE5] flex items-center justify-center">
          <div className="animate-pulse text-[#7F8790] font-medium">Initializing...</div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};