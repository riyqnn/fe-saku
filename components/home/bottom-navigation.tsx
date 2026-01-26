"use client"

import { useRouter, usePathname } from "next/navigation" 
import { User, Home as HomeIcon, Receipt } from "lucide-react"

export default function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    { id: "home", label: "Home", icon: HomeIcon, path: "/home" },
    { id: "transactions", label: "Transaction", icon: Receipt, path: "/transactions" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
  ]

  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/80 dark:from-background dark:via-background dark:to-background/80 border-t border-border/50 backdrop-blur-lg">
      <div className="max-w-lg mx-auto w-full px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-around gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            // Logika aktif: jika pathname sama dengan path menu
            const isActive = pathname === item.path

            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
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