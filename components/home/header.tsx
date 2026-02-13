"use client"

import { useAuth } from "@/hooks/useAuth"
import { useNotifications } from "@/hooks/useNotifications"
import { LogOut, User as UserIcon, Settings, Camera, Loader2, Bell } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

export default function HomeHeader() {
  const router = useRouter()
  const { user, logout, refreshUser } = useAuth()
  const { unreadCount, markAllAsRead } = useNotifications();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProfile = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data)
  }

  useEffect(() => {
    fetchProfile()
  }, [user])

  const getInitials = (name?: string | null, phone?: string): string => {
    if (name && name.trim()) {
      return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    }
    return phone ? phone.slice(-2).toUpperCase() : "S"
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (logic remains the same)
  }

  const handleNotificationClick = () => {
    markAllAsRead();
    router.push('/notifications');
  }

  return (
    <header className="relative z-50 px-4 sm:px-6 pt-6 pb-2 max-w-lg mx-auto font-sans">
      <div className="flex items-center justify-between gap-4 p-2">
        {/* Profile Button - Left */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="group relative flex items-center justify-center transition-transform active:scale-95"
          >
            <div className="relative w-11 h-11 rounded-full bg-white border-2 border-white overflow-hidden flex items-center justify-center shadow-md">
              {isUploading ? (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                </div>
              ) : null}
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-xs">
                  {getInitials(profile?.full_name, profile?.phone_number)}
                </div>
              )}
            </div>
          </button>
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute left-0 mt-3 w-56 bg-white/90 backdrop-blur-2xl border rounded-xl shadow-lg p-2 z-20 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
                {/* ... Dropdown content remains the same ... */}
                <div className="px-3 py-2 border-b border-gray-200/80 mb-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Account</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {profile?.full_name || profile?.phone_number || 'Saku User'}
                  </p>
                </div>
                <div className="space-y-1">
                  <button 
                    onClick={() => { setIsDropdownOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Title - Center */}
        <div className="text-center">
          <h1 className="text-2xl font-black italic text-black tracking-tighter">
            Saku
          </h1>
        </div>

        {/* Notification Button - Right */}
        <div className="relative">
          <button onClick={handleNotificationClick} className="relative p-3 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-white text-[8px] font-bold">
              </span>
            )}
          </button>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleUploadImage} className="hidden" accept="image/*" />
    </header>
  )
}