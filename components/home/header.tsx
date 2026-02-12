"use client"

import { useAuth } from "@/hooks/useAuth"
import { LogOut, User as UserIcon, Settings, Camera, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

export default function HomeHeader() {
  const { user, logout, refreshUser } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Logic: Ambil data profile terbaru saat user tersedia
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

  // Logic: Upload gambar persis seperti ProfileCard
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`

      // 1. Upload ke bucket avatars dengan folder user.id
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // 2. Ambil Public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      // 3. Update ke tabel profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError
      
      // 4. Update state lokal & global
      setProfile({ ...profile, avatar_url: publicUrl })
      await refreshUser() 
      toast.success("Foto profil diperbarui")
    } catch (err: any) {
      toast.error("Gagal mengunggah foto")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <header className="relative z-[100] px-4 sm:px-6 pt-8 pb-2 max-w-lg mx-auto font-sans">
      <div className="flex items-center justify-between gap-3 p-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black italic text-black tracking-tighter leading-none">
            Saku
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm font-bold text-black/40">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="group relative flex items-center justify-center transition-transform active:scale-95"
          >
            <div className="absolute -inset-1 bg-gradient-to-tr from-amber-500 to-orange-400 rounded-[1.4rem] opacity-20 group-hover:opacity-40 transition-opacity blur-sm" />
            
            <div className="relative w-12 h-12 rounded-2xl bg-white border-2 border-white overflow-hidden flex items-center justify-center">
              {isUploading ? (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                </div>
              ) : null}

              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white font-black text-xs italic tracking-tighter">
                  {getInitials(profile?.full_name, profile?.phone_number)}
                </div>
              )}
            </div>
          </button>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 mt-3 w-56 bg-white/90 backdrop-blur-2xl border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-2 z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="px-5 py-4 border-b border-gray-100/50 mb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Account</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {profile?.full_name || profile?.phone_number || 'Saku User'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  {/* <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-amber-50 rounded-2xl transition-all group"
                  >
                    <div className="p-2 bg-amber-100 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <Camera className="w-4 h-4" />
                    </div>
                    Change Photo
                  </button> */}

                  {/* <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-2xl transition-all">
                    <div className="p-2 bg-gray-100 rounded-xl">
                      <Settings className="w-4 h-4" />
                    </div>
                    Settings
                  </button> */}
                  
                  <div className="h-px bg-gray-100 my-1 mx-2" />

                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <div className="p-2 bg-red-100 rounded-xl">
                      <LogOut className="w-4 h-4" />
                    </div>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUploadImage} 
        className="hidden" 
        accept="image/*" 
      />
    </header>
  )
}