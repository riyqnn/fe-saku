"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Settings, LogOut } from "lucide-react"
import { useAuth } from "@/hooks/useAuth" // Update ke hook baru
import ProfileCard from "@/components/profile/profile-card"
import FoldersList from "@/components/profile/folders-list"
import CreateFolderModal from "@/components/profile/create-folder-modal"

export default function ProfilePage() {
  const router = useRouter()
  
  const { user, isLoading, logout, isAuthenticated } = useAuth()
  const [isShowCreateModal, setIsShowCreateModal] = useState(false)

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
    <div className="min-h-screen bg-[#F9EFE5] pb-28 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="sticky top-0 z-50 bg-[#F9EFE5]/80 backdrop-blur-lg border-b border-black/5">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <h1 className="text-lg font-bold text-black">My Profile</h1>
          <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <Settings className="w-5 h-5 text-black" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <ProfileCard />

        <div className="h-px bg-black/5" />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-black">Saved Contacts</h2>
              <p className="text-sm text-[#7F8790]">Organize your recipients</p>
            </div>
            <button
              onClick={() => setIsShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-bold rounded-2xl hover:scale-[1.02] transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>
          
          <FoldersList />
        </div>

        <div className="space-y-4 pt-6 border-t border-black/5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7F8790]">Account Settings</h3>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold transition-all border border-red-100 active:scale-[0.98]"
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