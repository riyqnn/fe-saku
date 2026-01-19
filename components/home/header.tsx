"use client"

import { useAuth } from "@/hooks/useAuth"

export default function HomeHeader() {
  const { user } = useAuth()

  // Get user initials for avatar
  const getInitials = (name?: string, phone?: string): string => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (phone) {
      return phone.slice(-2).toUpperCase()
    }
    return "U"
  }

  // Get user display name
  const getDisplayName = (): string => {
    if (user?.name) return user.name
    if (user?.phone) return user.phone
    return "User"
  }

  return (
    <header className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 space-y-1 sm:space-y-2">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Saku</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Welcome, {getDisplayName()}
          </p>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-xs sm:text-sm shadow-lg flex-shrink-0">
          {getInitials(user?.name, user?.phone)}
        </div>
      </div>
    </header>
  )
}
