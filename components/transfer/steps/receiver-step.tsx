"use client"

import { useState, useEffect } from "react"
import { X, Search, Users, Phone, UserPlus, Loader2 } from "lucide-react"
import { useContacts } from "@/hooks/useContacts"

type TabType = "phone" | "contacts"

export default function ReceiverStep({
  onSelect,
  onClose,
}: {
  onSelect: (name: string, phone: string) => void
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<TabType>("phone")
  const [search, setSearch] = useState("")
  const [phoneInput, setPhoneInput] = useState("")
  
  // State untuk pencarian global
  const [globalResults, setGlobalResults] = useState<any[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)

  const { contacts, loading, searchContacts } = useContacts()

  // 1. Filter dari kontak lokal
  const localFiltered = activeTab === "contacts" ? searchContacts(search) : []

  // 2. Logic cari ke API Profile (Global)
  useEffect(() => {
    const searchGlobal = async () => {
      if (search.length < 3) {
        setGlobalResults([])
        return
      }

      setIsSearchingGlobal(true)
      try {
        const res = await fetch(`/api/profile/search?query=${search}`)
        const data = await res.json()
        if (data.success) {
          // Filter agar tidak double dengan yang sudah ada di kontak lokal
          const filteredGlobal = data.profiles.filter(
            (gp: any) => !contacts.some(lc => lc.phone_number === gp.phone_number)
          )
          setGlobalResults(filteredGlobal)
        }
      } catch (err) {
        console.error("Global search failed", err)
      } finally {
        setIsSearchingGlobal(false)
      }
    }

    const timer = setTimeout(searchGlobal, 500) // Debounce 500ms
    return () => clearTimeout(timer)
  }, [search, contacts])

  const handlePhoneSubmit = () => {
    if (phoneInput.trim()) {
      onSelect(phoneInput.trim(), phoneInput.trim())
    }
  }

  return (
    <div className="p-5 sm:p-7 space-y-5 sm:space-y-6">
      {/* Header - Tetap Sama */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Send to</h2>
        <button onClick={onClose} className="p-2 sm:p-2.5 hover:bg-muted rounded-full transition-colors">
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
        </button>
      </div>

      {/* Tabs - Tetap Sama */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setActiveTab("phone")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === "phone" ? "bg-primary text-white shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Phone className="w-4 h-4" /> Phone Input
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === "contacts" ? "bg-primary text-white shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Users className="w-4 h-4" /> Contacts
        </button>
      </div>

      {activeTab === "phone" ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Phone Number</label>
            <input
              type="tel"
              placeholder="+62 812-3456-7890"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="input-modern w-full"
              autoFocus
            />
          </div>
          <button
            onClick={handlePhoneSubmit}
            disabled={!phoneInput.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold"
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-modern w-full pl-12"
            />
            {isSearchingGlobal && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
            )}
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {/* 1. Hasil Kontak Lokal */}
            {localFiltered.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onSelect(contact.name, contact.phone_number)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <p className="font-bold text-sm text-foreground truncate group-hover:text-primary">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.phone_number}</p>
                </div>
                {contact.wallet_address && (
                  <div className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-[10px] font-bold text-green-500 uppercase">User</p>
                  </div>
                )}
              </button>
            ))}

            {/* 2. Hasil Global (User Saku Lain) */}
            {globalResults.map((user, i) => (
              <button
                key={`global-${i}`}
                onClick={() => onSelect(user.full_name || user.phone_number, user.phone_number)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-dashed border-primary/20 hover:bg-primary/10 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {(user.full_name || "S").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <p className="font-bold text-sm text-foreground">{user.full_name || "Saku User"}</p>
                  <p className="text-xs text-muted-foreground">{user.phone_number}</p>
                </div>
                <div className="px-2 py-1 rounded-lg bg-blue-500 text-white">
                  <p className="text-[10px] font-bold uppercase">Find</p>
                </div>
              </button>
            ))}

            {/* Empty State */}
            {!loading && localFiltered.length === 0 && globalResults.length === 0 && search.length >= 3 && (
               <div className="text-center py-10">
                 <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                 <p className="text-sm text-muted-foreground">User not found</p>
               </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          💡 You can find any Saku user by their name or phone number
        </p>
      </div>
    </div>
  )
}