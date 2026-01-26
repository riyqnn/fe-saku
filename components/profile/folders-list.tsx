"use client"

import React, { useState, useRef, useEffect } from "react"
import { 
  User, MoreVertical, Trash2, Search, UserPlus, 
  X, Loader2, Plus, Check, Phone 
} from "lucide-react"
import { useContacts } from "@/hooks/useContacts"
import { toast } from "sonner"

export default function FoldersManager() {
  const { contacts, loading, addContact, deleteContact, searchContacts } = useContacts()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/profile/search?query=${val}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.profiles);
      }
    } catch (err) {
      console.error("Search error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveContact = async (profile: any) => {
    try {
      const result = await addContact({
        name: profile.full_name || profile.phone_number,
        phone_number: profile.phone_number
      })

      if (result.success) {
        toast.success("Contact saved!")
        setIsModalOpen(false)
        setSearchQuery("")
        setSearchResults([])
      } else {
        toast.error(result.error || "Failed to save")
      }
    } catch (err) {
      toast.error("An error occurred")
    }
  }

  const handleDelete = async (id: string) => {
    console.log("Menghapus ID:", id); 
    await deleteContact(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">My Contacts</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted/30 border border-border/50 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border/50 bg-muted/5 space-y-3">
          <User className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium text-sm">No contacts saved yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="group p-4 rounded-3xl border border-border/50 bg-card/50 hover:border-primary/30 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{contact.name}</h3>
                    <p className="text-xs text-muted-foreground">{contact.phone_number}</p>
                  </div>
                </div>

                <div className="relative">
                  <button onClick={() => setExpandedMenu(expandedMenu === contact.id ? null : contact.id)} className="p-2">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {expandedMenu === contact.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-card border border-border/50 rounded-2xl shadow-xl z-50">
                      <button 
                        onClick={() => handleDelete(contact.id)}
                        className="w-full px-4 py-3 text-left text-xs text-destructive flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
          <div className="bg-card border border-border/50 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-border/50 flex justify-between items-center">
              <h2 className="font-bold">Find Someone</h2>
              <button onClick={() => { setIsModalOpen(false); setSearchResults([]); }} className="p-2 hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Input Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full bg-muted/50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-primary/20 outline-none"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>

              {/* Search Results List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {isSearching && <p className="text-center text-xs text-muted-foreground">Searching user...</p>}
                
                {searchResults.map((user, i) => (
                  <div 
                    key={i}
                    className="p-4 rounded-3xl bg-muted/30 border border-transparent hover:border-primary/30 flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {user.full_name || "Saku User"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {user.phone_number}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSaveContact(user)}
                      className="p-2 bg-primary text-primary-foreground rounded-xl hover:scale-110 transition-transform"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
                  <p className="text-center text-xs text-muted-foreground py-4">User not found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}