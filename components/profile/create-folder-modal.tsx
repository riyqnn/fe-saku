"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useProfileFolders } from "@/hooks/useProfileFolders"

interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateFolderModal({ isOpen, onClose }: CreateFolderModalProps) {
  const { user } = useAuth()
  const walletAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null
  const { createFolder, isLoading } = useProfileFolders(walletAddress)
  
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Folder name is required")
      return
    }

    try {
      await createFolder(name, description)
      console.log('✅ [CreateFolderModal] Folder created successfully')
      setName("")
      setDescription("")
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to create folder")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 sm:p-6 border-b border-border bg-card/95 backdrop-blur-sm">
          <h2 className="text-lg font-semibold">Create New Folder</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Folder Name */}
          <div className="space-y-2">
            <label htmlFor="folder-name" className="text-sm font-medium text-foreground">
              Folder Name *
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Documents, Photos, Projects"
              maxLength={50}
              className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors"
            />
            <p className="text-xs text-muted-foreground">{name.length}/50</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="folder-desc" className="text-sm font-medium text-foreground">
              Description (Optional)
            </label>
            <textarea
              id="folder-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this folder..."
              maxLength={200}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors resize-none"
            />
            <p className="text-xs text-muted-foreground">{description.length}/200</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Folder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
