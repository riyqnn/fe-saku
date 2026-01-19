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
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-md">
      {/* Responsive container - full width on mobile, max-w-lg on larger screens */}
      <div className="max-w-lg mx-auto w-full px-0 py-2 sm:py-3">
        <div className="flex items-center justify-around">
          {[
            { id: "home", label: "Home", icon: HomeIcon },
            { id: "transactions", label: "Transactions", icon: History },
            { id: "wallet", label: "Wallet", icon: Wallet },
            { id: "profile", label: "Profile", icon: User },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className="flex flex-col items-center gap-0.5 px-2 sm:px-4 py-2 flex-1 rounded-lg transition-colors duration-200 group hover:bg-secondary/50"
              >
                <Icon
                  className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span
                  className={`text-xs font-medium transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
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
