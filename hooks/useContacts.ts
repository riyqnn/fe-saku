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

export interface CreateContactParams {
  name: string
  phone_number: string
}

export interface CreateContactResult {
  success: boolean
  contact?: Contact
  error?: string
}

export interface DeleteContactResult {
  success: boolean
  error?: string
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/contacts")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch contacts")
      }

      setContacts(data.contacts || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const addContact = useCallback(async (params: CreateContactParams): Promise<CreateContactResult> => {
    try {
      setError(null)

      if (!params.name || !params.phone_number) {
        throw new Error("Name and phone number are required")
      }

      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create contact")
      }

      // Refresh contacts list
      await fetchContacts()

      return {
        success: true,
        contact: data.contact,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [fetchContacts])

  const deleteContact = useCallback(async (id: string): Promise<DeleteContactResult> => {
    try {
      setError(null)

      if (!id) {
        throw new Error("Contact ID is required")
      }

      const response = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete contact")
      }

      // Refresh contacts list
      await fetchContacts()

      return {
        success: true,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [fetchContacts])

  const searchContacts = useCallback((query: string) => {
    if (!query) return contacts

    const lowerQuery = query.toLowerCase()
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.phone_number.includes(lowerQuery)
    )
  }, [contacts])

  return {
    contacts,
    loading,
    error,
    fetchContacts,
    addContact,
    deleteContact,
    searchContacts,
  }
}
