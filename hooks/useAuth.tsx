"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  phone_number: string
  wallet_address: string
  is_verified: boolean
  full_name: string | null
}

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (phoneNumber: string, otpCode: string) => Promise<any>
  logout: () => Promise<void>
  requestOTP: (phoneNumber: string) => Promise<{ success: boolean }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('id, phone_number, wallet_address, is_verified, full_name')
        .eq('id', session.user.id)
        .maybeSingle(); 

      if (dbError) {
        console.error("Error fetching profile:", dbError.message);
        setUser(null);
      } else if (!profile) {
        setUser(null); 
      } else {
        setUser(profile);
      }
    } catch (err: any) {
      console.error("Error refresh user:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refreshUser()
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [refreshUser])

  const requestOTP = async (phoneNumber: string) => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber })
    setIsLoading(false)
    if (error) throw error
    return { success: true }
  }

  const login = async (phoneNumber: string, otpCode: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otpCode,
        type: 'sms',
      })
      if (error) throw error
      await refreshUser()
      return { success: true, user: data.user }
    } catch (err: any) {
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    // await supabase.auth.signOut() 
    setUser(null) 
    router.replace('/get-started')
    console.log("logout boongan")
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      error, 
      login, 
      logout, 
      requestOTP, 
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}