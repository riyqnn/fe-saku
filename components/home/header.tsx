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
    // Logika upload (tidak diubah)
  }

  const handleNotificationClick = () => {
    markAllAsRead();
    router.push('/notifications');
  }

  return (
    <header className="relative z-50 px-5 sm:px-6 pt-8 pb-4 max-w-lg mx-auto font-sans">
      <div className="flex items-center justify-between">
        
        {/* Left Side: Profile + Greeting */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          
          {/* Profile Button */}
          <div className="relative shrink-0">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="group relative flex items-center justify-center transition-transform active:scale-95"
            >
              <div className="relative w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                {isUploading ? (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  </div>
                ) : null}
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(profile?.full_name, profile?.phone_number)}
                  </div>
                )}
              </div>
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute left-0 mt-3 w-56 bg-white/90 backdrop-blur-2xl border rounded-xl shadow-lg p-2 z-20 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
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

          {/* Greeting Text */}
          <div className="flex flex-col min-w-0 justify-center">
            <p className="text-sm font-medium text-gray-500 leading-tight mb-0.5">
              Welcome,
            </p>
            <p className="text-xl font-bold text-slate-900 truncate tracking-tight leading-tight">
              {profile?.full_name || profile?.phone_number || 'User'}
            </p>
          </div>
        </div>

        {/* Notification Button - Right */}
        <div className="relative shrink-0 ml-4">
          <button 
            onClick={handleNotificationClick} 
            className="relative p-2 bg-gray-200 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Bell className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
              </span>
            )}
          </button>
        </div>
        
      </div>
      <input type="file" ref={fileInputRef} onChange={handleUploadImage} className="hidden" accept="image/*" />
    </header>
  )
}