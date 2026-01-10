"use client"

import { useState } from "react"

export default function ReceiverStep({
  onSelect,
  onClose,
}: {
  onSelect: (name: string, phone: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState("")

  const contacts = [
    { name: "Budi", phone: "+62812xxxxxx" },
    { name: "Siti", phone: "+62812xxxxxx" },
    { name: "Ahmad", phone: "+62812xxxxxx" },
    { name: "Nisa", phone: "+62812xxxxxx" },
  ]

  const filtered = contacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
  )

  return (
    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Pilih Penerima</h2>
        <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground">
          ✕
        </button>
      </div>

      <input
        type="text"
        placeholder="Ketik nama atau nomor HP"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      <div className="space-y-2">
        {filtered.map((contact, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(contact.name, contact.phone)}
            className="w-full flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:bg-muted transition-colors text-left"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold">{contact.name[0]}</span>
            </div>
            <div>
              <p className="font-medium text-foreground">{contact.name}</p>
              <p className="text-xs text-muted-foreground">{contact.phone}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
