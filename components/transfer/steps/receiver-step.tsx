"use client"

import { useState, useEffect } from "react"
import { X, Search, Users, Phone, Loader2, ChevronRight, UserCircle2 } from "lucide-react"
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
  
  const [globalResults, setGlobalResults] = useState<any[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)

  const { contacts, loading, searchContacts } = useContacts()

  const localFiltered = activeTab === "contacts" ? searchContacts(search) : []

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
          const filteredGlobal = data.profiles.filter(
            (gp: any) => !contacts.some(lc => lc.phone_number === gp.phone_number)
          )
          setGlobalResults(filteredGlobal)
        }
      } catch (err) {
        // Silently handle
      } finally {
        setIsSearchingGlobal(false)
      }
    }

    const timer = setTimeout(searchGlobal, 500)
    return () => clearTimeout(timer)
  }, [search, contacts])

  const handlePhoneSubmit = () => {
    if (phoneInput.trim()) {
      onSelect(phoneInput.trim(), phoneInput.trim())
    }
  }

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Transfer Funds</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Choose how you want to send money</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-all duration-200"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex p-1 bg-slate-100/80 rounded-2xl mb-6">
          <button
            onClick={() => setActiveTab("phone")}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
              activeTab === "phone" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            <Phone className="w-3.5 h-3.5" /> Direct Number
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
              activeTab === "contacts" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> My Contacts
          </button>
        </div>

        {activeTab === "phone" ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative group">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block ml-1">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +62 812 3456 7890"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                autoFocus
              />
            </div>
            <button
              onClick={handlePhoneSubmit}
              disabled={!phoneInput.trim()}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-lg shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale"
            >
              Continue to Amount
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name or phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-11 pr-12 text-sm font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              {isSearchingGlobal && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
              )}
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {search.length > 0 && (
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3 ml-1">Search Results</p>
              )}
              
              {localFiltered.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => onSelect(contact.name, contact.phone_number)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-primary/40 hover:bg-primary/[0.02] transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="font-bold text-sm text-slate-900 truncate group-hover:text-primary transition-colors">{contact.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{contact.phone_number}</p>
                  </div>
                  {contact.wallet_address && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold border border-emerald-100">
                      SAVED
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                </button>
              ))}

              {globalResults.map((user, i) => (
                <button
                  key={`global-${i}`}
                  onClick={() => onSelect(user.full_name || user.phone_number, user.phone_number)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-primary/[0.04] border border-dashed border-primary/30 hover:bg-primary/[0.08] transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary text-slate-900 flex items-center justify-center font-black text-sm">
                    {(user.full_name || "S").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">{user.full_name || "Saku User"}</p>
                    <p className="text-xs text-slate-500 font-medium">{user.phone_number}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-primary text-[9px] font-bold border border-primary/20 shadow-sm">
                    <UserCircle2 className="w-2.5 h-2.5" /> NEW
                  </div>
                </button>
              ))}

              {!loading && localFiltered.length === 0 && globalResults.length === 0 && search.length >= 3 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">No users found</p>
                  <p className="text-xs text-slate-400 mt-1">We couldn't find anyone matching "{search}"</p>
                </div>
              )}

              {search.length < 1 && activeTab === "contacts" && contacts.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">Your contact list is empty</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto p-6 bg-slate-50/50 border-t border-slate-100 rounded-b-3xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-1 rounded-full bg-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed italic">
            <strong>Pro tip:</strong> You can search for anyone in the Saku network by their name or phone number, even if they aren't in your contacts.
          </p>
        </div>
      </div>
    </div>
  )
}