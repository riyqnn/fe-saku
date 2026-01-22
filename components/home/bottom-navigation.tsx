"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet, History, User, Home as HomeIcon } from "lucide-react"

export default function BottomNavigation() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState("home")

  const handleNavigation = (id: string) => {
    setActiveNav(id)
    switch (id) {
      case "home":
        router.push("/home")
        break
      case "transactions":
        router.push("/transactions")
        break
      case "wallet":
        router.push("/wallet")
        break
      case "profile":
        router.push("/profile")
        break
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/80 dark:from-background dark:via-background dark:to-background/80 border-t border-border/50 backdrop-blur-lg">
      {/* Responsive container - full width on mobile, max-w-lg on larger screens */}
      <div className="max-w-lg mx-auto w-full px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-around gap-1">
          {[
            { id: "home", label: "Home", icon: HomeIcon },
            { id: "transactions", label: "Activity", icon: History },
            { id: "wallet", label: "Wallet", icon: Wallet },
            { id: "profile", label: "Profile", icon: User },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`flex flex-col items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 flex-1 rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? "bg-primary/10 dark:bg-primary/20"
                    : "hover:bg-muted dark:hover:bg-muted/50"
                }`}
              >
                <Icon
                  className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${
                    isActive 
                      ? "text-primary scale-110" 
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span
                  className={`text-xs sm:text-xs font-semibold transition-all duration-200 ${
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
