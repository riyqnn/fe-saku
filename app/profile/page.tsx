"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Settings, LogOut } from "lucide-react"
import { useAuth } from "@/hooks/useAuth" 
import ProfileCard from "@/components/profile/profile-card"
import FoldersManager from "@/components/profile/folders-list" 

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading, logout, isAuthenticated } = useAuth()

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
        {/* Bagian Atas: Info User */}
        <ProfileCard />

        <div className="h-px bg-black/5" />

        {/* Bagian Tengah: Manajemen Folder/Kontak */}
        {/* Kita tidak perlu lagi judul "Saved Contacts" dan tombol "New" di sini 
            karena sudah dipindahkan ke dalam FoldersManager agar lebih efisien.
        */}
        <FoldersManager />

        {/* Bagian Bawah: Settings & Logout */}
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
    </div>
  )
}