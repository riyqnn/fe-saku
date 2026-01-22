"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Settings, LogOut } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import ProfileCard from "@/components/profile/profile-card"
import FoldersList from "@/components/profile/folders-list"
import CreateFolderModal from "@/components/profile/create-folder-modal"

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [isShowCreateModal, setIsShowCreateModal] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const walletAddress = localStorage.getItem('walletAddress')
      if (!walletAddress) {
        router.push("/get-started")
        return
      }
      setIsCheckingAuth(false)
    }
    
    if (!isLoading) {
      checkAuth()
    }
  }, [isLoading])

  const handleLogout = () => {
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('privateKey')
    localStorage.removeItem('phoneNumber')
    localStorage.removeItem('isOnboarded')
    router.push("/get-started")
  }

  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground mt-4 text-sm">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-background via-background to-background/80 dark:from-background dark:via-background dark:to-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 sm:p-2.5 hover:bg-muted rounded-full transition-colors duration-200"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            My Profile
          </h1>
          <button className="p-2 sm:p-2.5 hover:bg-muted rounded-full transition-colors duration-200" aria-label="Settings">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Profile Card */}
        <div className="animate-fade-in-up">
          <ProfileCard />
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-border via-border to-transparent" />

        {/* Folders Section */}
        <div className="space-y-5 sm:space-y-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Saved Contacts</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Organize your frequent recipients</p>
            </div>
            <button
              onClick={() => setIsShowCreateModal(true)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>

          <FoldersList />
        </div>

        {/* Account Actions */}
        <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-border/50 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <h3 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">Account</h3>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold text-sm transition-all duration-200 border border-destructive/20"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isShowCreateModal}
        onClose={() => setIsShowCreateModal(false)}
      />
    </div>
  )
}
