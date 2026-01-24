// "use client"

// import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
// import { supabase } from '@/lib/supabaseClient'
// import { useRouter } from 'next/navigation'

// interface UserProfile {
//   id: string
//   phone_number: string
//   wallet_address: string
//   is_verified: boolean
//   full_name: string | null
// }

// interface AuthContextType {
//   user: UserProfile | null
//   isAuthenticated: boolean
//   isLoading: boolean
//   error: string | null
//   login: (phoneNumber: string, otpCode: string) => Promise<any>
//   logout: () => Promise<void>
//   requestOTP: (phoneNumber: string) => Promise<{ success: boolean }>
//   refreshUser: () => Promise<void>
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined)

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<UserProfile | null>(null)
//   const [isLoading, setIsLoading] = useState(true)
//   const [error, setError] = useState<string | null>(null)
//   const router = useRouter()

//   const refreshUser = useCallback(async () => {
//     try {
//       setIsLoading(true);
//       const { data: { session } } = await supabase.auth.getSession();

//       if (!session || !session.user) {
//         setUser(null);
//         setIsLoading(false);
//         return;
//       }

//       const { data: profile, error: dbError } = await supabase
//         .from('profiles')
//         .select('id, phone_number, wallet_address, is_verified, full_name')
//         .eq('id', session.user.id)
//         .maybeSingle(); 

//       if (dbError) {
//         console.error("Error fetching profile:", dbError.message);
//         setUser(null);
//       } else if (!profile) {
//         setUser(null); 
//       } else {
//         setUser(profile);
//       }
//     } catch (err: any) {
//       console.error("Error refresh user:", err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     refreshUser()

//     const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
//       if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
//         refreshUser()
//       }
//       if (event === 'SIGNED_OUT') {
//         setUser(null)
//       }
//     })

//     return () => subscription.unsubscribe()
//   }, [refreshUser])

//   const requestOTP = async (phoneNumber: string) => {
//     setIsLoading(true)
//     const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber })
//     setIsLoading(false)
//     if (error) throw error
//     return { success: true }
//   }

//   const login = async (phoneNumber: string, otpCode: string) => {
//     setIsLoading(true)
//     try {
//       const { data, error } = await supabase.auth.verifyOtp({
//         phone: phoneNumber,
//         token: otpCode,
//         type: 'sms',
//       })
//       if (error) throw error
//       await refreshUser()
//       return { success: true, user: data.user }
//     } catch (err: any) {
//       throw err
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   const logout = async () => {
//     // await supabase.auth.signOut() 
//     setUser(null) 
//     router.replace('/get-started')
//     console.log("logout boongan")
//   }

//   return (
//     <AuthContext.Provider value={{ 
//       user, 
//       isAuthenticated: !!user, 
//       isLoading, 
//       error, 
//       login, 
//       logout, 
//       requestOTP, 
//       refreshUser 
//     }}>
//       {children}
//     </AuthContext.Provider>
//   )
// }

// export const useAuth = () => {
//   const context = useContext(AuthContext)
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider')
//   }
//   return context
// }

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

