"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import HomeHeader from "@/components/home/header"
import BalanceCardSection from "@/components/home/balance-card-section"
import QuickActions from "@/components/home/quick-actions"
import RecentTransactions from "@/components/home/recent-transactions"
import BottomNavigation from "@/components/home/bottom-navigation"
import { useAuth } from "@/hooks/useAuth"

export default function Home() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  // Check authentication and redirect if needed
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait a bit for auth state to be ready
        if (!authLoading && !hasCheckedAuth) {
          if (!user) {
            console.log('❌ [Home] No user, redirecting to get-started')
            // User not authenticated, redirect to get-started
            router.push("/get-started")
          } else {
            console.log('✅ [Home] User authenticated:', user.phone)
            // User authenticated, ready to show home
            setIsInitializing(false)
          }
          setHasCheckedAuth(true)
        }
      } catch (err) {
        console.error("Auth check failed:", err)
        setIsInitializing(false)
      }
    }

    checkAuth()
  }, [user, authLoading, hasCheckedAuth, router])

  // Show loading state while checking authentication
  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-background dark:bg-background overflow-hidden flex items-center justify-center">
        <div className="max-w-lg mx-auto w-full h-screen bg-background dark:bg-background flex flex-col items-center justify-center">
          {/* Loading Spinner */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Loading wallet...</p>
          </div>
        </div>
      </div>
    )
  }

  // Only show home page if user is authenticated
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background overflow-hidden">
      {/* Full width container with mobile frame max-width */}
      <div className="max-w-lg mx-auto h-screen bg-background dark:bg-background flex flex-col relative">
        {/* Header - shows user info and welcome */}
        <HomeHeader />

        {/* Scrollable Content - Responsive padding */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-28 sm:pb-32 space-y-5 sm:space-y-7 pt-4 sm:pt-6">
          {/* Balance Card - fetches from blockchain */}
          <BalanceCardSection />

          {/* Quick Actions - transfer, withdraw, deposit, pay */}
          <QuickActions />

          {/* Recent Transactions - real-time updates from database */}
          <RecentTransactions />

          {/* Bottom spacing */}
          <div className="h-4" />
        </div>

        {/* Bottom Navigation - Full width responsive */}
        <BottomNavigation />
      </div>
    </div>
  )
}
