"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { useAuth } from "@/hooks/useAuth" 
import ProfileCard from "@/components/profile/profile-card"
import FoldersManager from "@/components/profile/folders-list" 
// Import komponen yang sama dengan Home
import HomeHeader from "@/components/home/header"
import BottomNavigation from "@/components/home/bottom-navigation"

export default function ProfilePage() {
  const router = useRouter()
  const { isLoading, logout, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/get-started")
    }
  }, [isLoading, isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9EFE5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#7F8790] mt-4 font-medium">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background pb-24 animate-in fade-in duration-500">
      <HomeHeader />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <ProfileCard />

        <div className="h-px bg-border/50" />

        <FoldersManager />

        <div className="space-y-4 pt-6 border-t border-border/50">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Account Settings</h3>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 font-bold transition-all border border-red-100 dark:border-red-900/30 active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}