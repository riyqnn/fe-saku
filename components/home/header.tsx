"use client"

import { useAuth } from "@/hooks/useAuth"
import { Settings } from "lucide-react"

export default function HomeHeader() {
  const { user } = useAuth()

  const getInitials = (name?: string | null, phone?: string): string => {
    if (name && name.trim()) {
      return name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (phone) {
      return phone.slice(-2).toUpperCase()
    }
    return "User"
  }

  const getDisplayName = (): string => {
    if (user?.full_name) return user.full_name 
    if (user?.phone_number) return user.phone_number 
    return "User"
  }

  return (
    <header className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6  top-0 z-50 bg-gradient-to-b from-background via-background to-background/80 backdrop-blur-md border-b border-border/50 max-w-lg mx-auto font-sans">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold italic text-gradient bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Saku
          </h1>
          <p className="text-xs sm:text-sm text-black/50 truncate mt-0.5">
            Welcome back, {getDisplayName()}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button className="p-2 sm:p-2.5 rounded-full hover:bg-muted transition-colors duration-200">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-black/85" />
          </button>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-black font-semibold text-xs sm:text-sm shadow-lg">
            {/* Kirim data full_name dan phone_number */}
            {getInitials(user?.full_name, user?.phone_number)}
          </div>
        </div>
      </div>
    </header>
  )
}