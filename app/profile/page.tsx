"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Settings, LogOut } from "lucide-react"
import { useAuthContext } from "@/context/AuthContext" 
import ProfileCard from "@/components/profile/profile-card"
import FoldersList from "@/components/profile/folders-list"
import CreateFolderModal from "@/components/profile/create-folder-modal"

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading, logout, isAuthenticated } = useAuthContext()
  const [isShowCreateModal, setIsShowCreateModal] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/get-started")
    }
  }, [isLoading, isAuthenticated, router])

  const handleLogout = () => {
    logout() 
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground mt-4 text-sm">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-8">
      <div className="sticky top-0 z-50 bg-gradient-to-b from-background via-background to-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">My Profile</h1>
          <button className="p-2 hover:bg-muted rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <ProfileCard />

        <div className="h-px bg-border/50" />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Saved Contacts</h2>
              <p className="text-sm text-muted-foreground">Organize your recipients</p>
            </div>
            <button
              onClick={() => setIsShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-2xl"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>
          <FoldersList />
        </div>

        <div className="space-y-4 pt-6 border-t border-border/50">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Account</h3>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold transition-all border border-destructive/20"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      <CreateFolderModal
        isOpen={isShowCreateModal}
        onClose={() => setIsShowCreateModal(false)}
      />
    </div>
  )
}