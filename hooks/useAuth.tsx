"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

// Inisialisasi client biasa (bukan SSR) untuk cek profile
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true)
      // Ambil nomor HP dari storage yang diset saat verify-otp
      const savedPhone = localStorage.getItem('saku_user_phone')

      if (!savedPhone) {
        setUser(null)
        return
      }

      // Ambil data profile berdasarkan nomor HP
      const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('id, phone_number, wallet_address, is_verified, full_name')
        .eq('phone_number', savedPhone)
        .maybeSingle()

      if (dbError || !profile) {
        console.error("Profile not found or error:", dbError?.message)
        setUser(null)
      } else {
        setUser(profile)
      }
    } catch (err) {
      console.error("Auth Refresh Error:", err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const logout = () => {
    localStorage.removeItem('saku_user_phone')
    localStorage.removeItem('saku_wallet_address')
    setUser(null)
    router.replace('/get-started')
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      logout, 
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider')
  return context
}

