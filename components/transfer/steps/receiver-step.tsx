"use client"

import { useState } from "react"
import { X, Search, Users } from "lucide-react"

export default function ReceiverStep({
  onSelect,
  onClose,
}: {
  onSelect: (name: string, phone: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState("")

  const contacts = [
    { name: "Budi Santoso", phone: "+62812xxxxxx" },
    { name: "Siti Nurhaliza", phone: "+62812xxxxxx" },
    { name: "Ahmad Wijaya", phone: "+62812xxxxxx" },
    { name: "Nisa Sabrina", phone: "+62812xxxxxx" },
  ]

  const filtered = contacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
  )

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

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-modern w-full pl-12 sm:pl-14"
          autoFocus
        />
      </div>

      {/* Contacts List */}
      <div className="space-y-2.5 sm:space-y-3 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-8 sm:py-10">
            <Users className="w-12 h-12 sm:w-14 sm:h-14 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm sm:text-base text-muted-foreground font-medium">No contacts found</p>
            <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1">Try a different search</p>
          </div>
        ) : (
          filtered.map((contact, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(contact.name, contact.phone)}
              className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-card/50 hover:bg-card/80 border border-border/50 hover:border-primary/30 transition-all duration-200 text-left group active:scale-95"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-accent/20 transition-colors font-bold text-sm sm:text-base text-primary">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                  {contact.name}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">{contact.phone}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Quick Info */}
      <div className="pt-4 sm:pt-6 border-t border-border/50">
        <p className="text-xs sm:text-sm text-muted-foreground text-center">
          💡 Contacts from your saved folders appear here
        </p>
      </div>
    </div>
  )
}
