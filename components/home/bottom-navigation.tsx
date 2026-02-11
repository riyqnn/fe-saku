"use client"

import { useRouter, usePathname } from "next/navigation"
import { User, Home, Receipt, TrendingUp } from "lucide-react"

export default function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    { label: "Home", icon: Home, path: "/home" },
    { label: "Transaction", icon: Receipt, path: "/transactions" },
    { label: "Staking", icon: TrendingUp, path: "/staking" },
    { label: "Profile", icon: User, path: "/profile" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t backdrop-blur">
      <div className="max-w-lg mx-auto px-4 py-3 flex justify-around">
        {navItems.map(({ label, icon: Icon, path }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`flex flex-col items-center ${
                active ? "text-primary" : "text-black/40"
              }`}
            >
              <Icon />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
