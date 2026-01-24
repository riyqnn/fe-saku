"use client"

import { useState, useEffect } from "react"
import { X, Search, Users, Phone } from "lucide-react"
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
  const { contacts, loading, searchContacts } = useContacts()

  const filtered = activeTab === "contacts" ? searchContacts(search) : []

  const handlePhoneSubmit = () => {
    if (phoneInput.trim()) {
      // Use phone number as name if no name is provided
      onSelect(phoneInput.trim(), phoneInput.trim())
    }
  }

  return (
    <div className="p-5 sm:p-7 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Send to</h2>
        <button
          onClick={onClose}
          className="p-2 sm:p-2.5 hover:bg-muted rounded-full transition-colors duration-200"
          aria-label="Close"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setActiveTab("phone")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === "phone"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Phone className="w-4 h-4" />
          Phone Input
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === "contacts"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Contacts ({contacts.length})
        </button>
      </div>

      {/* Phone Input Tab */}
      {activeTab === "phone" && (
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && phoneInput.trim()) {
                  handlePhoneSubmit()
                }
              }}
            />
          </div>

          <button
            onClick={handlePhoneSubmit}
            disabled={!phoneInput.trim()}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95"
          >
            Continue
          </button>

          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-muted-foreground text-center">
              Enter the recipient's phone number to send IDRX tokens directly
            </p>
          </div>
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-modern w-full pl-12 sm:pl-14"
            />
          </div>

          {/* Contacts List */}
          <div className="space-y-2.5 sm:space-y-3 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 sm:py-10">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 sm:py-10">
                <Users className="w-12 h-12 sm:w-14 sm:h-14 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm sm:text-base text-muted-foreground font-medium">No contacts yet</p>
                <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1">
                  Add contacts by sending money to new people
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 sm:py-10">
                <Search className="w-12 h-12 sm:w-14 sm:h-14 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm sm:text-base text-muted-foreground font-medium">No contacts found</p>
                <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1">Try a different search</p>
              </div>
            ) : (
              filtered.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => onSelect(contact.name, contact.phone_number)}
                  className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-card/50 hover:bg-card/80 border border-border/50 hover:border-primary/30 transition-all duration-200 text-left group active:scale-95"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-accent/20 transition-colors font-bold text-sm sm:text-base text-primary">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{contact.phone_number}</p>
                  </div>
                  {contact.wallet_address && (
                    <div className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs font-semibold text-green-500">User</p>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Info */}
      <div className="pt-4 sm:pt-6 border-t border-border/50">
        <p className="text-xs sm:text-sm text-muted-foreground text-center">
          💡 Transfer IDRX tokens to phone numbers instantly
        </p>
      </div>
    </div>
  )
}
