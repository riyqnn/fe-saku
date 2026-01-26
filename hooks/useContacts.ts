// hooks/useContacts.ts
"use client"

import { useState, useCallback, useEffect } from "react"

export interface Contact {
  id: string
  user_id: string
  name: string
  phone_number: string
  wallet_address: string | null
  created_at: string
  updated_at: string
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const savedPhone = localStorage.getItem('saku_user_phone');
      if (!savedPhone) return;

      const response = await fetch("/api/contacts", {
        headers: { 'x-saku-phone': savedPhone }
      });
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to fetch contacts")
      setContacts(data.contacts || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const addContact = useCallback(async (params: { name: string; phone_number: string }) => {
    try {
      const savedPhone = localStorage.getItem('saku_user_phone');
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-saku-phone': savedPhone || '',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create contact")
      
      await fetchContacts() // Refresh list
      return { success: true, contact: data.contact }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [fetchContacts])

  const deleteContact = useCallback(async (id: string) => {
    try {
      const savedPhone = localStorage.getItem('saku_user_phone'); // 1. Ambil No HP

      const response = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
        headers: {
          'x-saku-phone': savedPhone || '', // 2. KIRIM KE BACKEND
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete contact");

      await fetchContacts(); // Refresh daftar kontak setelah hapus
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchContacts]);

  // Fungsi pencarian yang bisa dipakai di UI
  const filterContacts = useCallback((query: string) => {
    if (!query) return contacts; // Kembalikan semua kontak jika query kosong
    const lowerQuery = query.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) || 
      c.phone_number.includes(lowerQuery)
    );
  }, [contacts]);

  return {
    contacts,
    loading,
    error,
    addContact,
    deleteContact,
    searchContacts: filterContacts,
    refreshContacts: fetchContacts
  }
}