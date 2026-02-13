"use client"

import { useState } from "react"
import { Search, User, Check, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Contact {
  id: string
  name: string
  phone: string
  wallet_address?: string
}

interface ContactSelectorProps {
  contacts: Contact[]
  selectedContacts: Contact[]
  onToggleContact: (contact: Contact) => void
}

export default function ContactSelector({ contacts, selectedContacts, onToggleContact }: ContactSelectorProps) {
  const [search, setSearch] = useState("")

  const filtered = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  )

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-muted/50 rounded-2xl outline-none focus:ring-2 ring-primary/20 transition-all font-medium text-sm"
        />
      </div>

      {/* Selected Chips */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {selectedContacts.map(c => (
            <motion.div
              key={c.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-1.5 pl-3 pr-1 py-1.5 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-wider"
            >
              {c.name}
              <button onClick={() => onToggleContact(c)} className="p-0.5 bg-white/20 rounded-full">
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Contact List */}
      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
        {filtered.map(contact => {
          const isSelected = selectedContacts.find(sc => sc.id === contact.id)
          return (
            <button
              key={contact.id}
              onClick={() => onToggleContact(contact)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-white"
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">{contact.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{contact.phone}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                isSelected ? "bg-primary border-primary text-white" : "border-border"
              }`}>
                {isSelected && <Check size={14} strokeWidth={3} />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}