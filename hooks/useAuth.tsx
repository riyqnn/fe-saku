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
  avatar_url?: string | null
}

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => void
  refreshUser: () => Promise<void>
  setToken: (token: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('saku_auth_token')
    if (savedToken) {
      setToken(savedToken)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true)

      // Check if token exists
      const savedToken = localStorage.getItem('saku_auth_token')
      if (!savedToken) {
        setUser(null)
        setToken(null)
        return
      }

      // Decode JWT to get phone number (without verification for UI purposes)
      // Verification happens on API side
      const payload = JSON.parse(atob(savedToken.split('.')[1]))
      const userPhone = payload.phone

      if (!userPhone) {
        setUser(null)
        return
      }

      // Ambil data profile berdasarkan nomor HP dari JWT
      const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('id, phone_number, wallet_address, is_verified, full_name')
        .eq('phone_number', userPhone)
        .maybeSingle()

      if (dbError || !profile) {
        setUser(null)
        localStorage.removeItem('saku_auth_token')
        localStorage.removeItem('saku_user_phone') // Tambahkan ini
        setToken(null)
      } else {
        setUser(profile)
        setToken(savedToken)
        // Pastikan localStorage sinkron untuk kebutuhan hooks lain
        localStorage.setItem('saku_user_phone', profile.phone_number)
        if (profile.wallet_address) {
          localStorage.setItem('saku_wallet_address', profile.wallet_address)
        }
      }
    } catch (err) {
      setUser(null)
      setToken(null)
    } finally {
      setTimeout(() => {
        setIsLoading(false)
      }, 3000)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const logout = () => {
    localStorage.removeItem('saku_auth_token')
    localStorage.removeItem('saku_user_phone')
    localStorage.removeItem('saku_wallet_address')
    setUser(null)
    setToken(null)
    router.replace('/get-started')
  }

  // Update token and localStorage
  const updateToken = (newToken: string) => {
    setToken(newToken)
    localStorage.setItem('saku_auth_token', newToken)
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      logout,
      refreshUser,
      setToken: updateToken
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

