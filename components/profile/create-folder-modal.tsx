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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-lg"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border/50 rounded-3xl sm:rounded-4xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-auto animate-fade-in-scale">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-5 sm:p-7 border-b border-border/50 bg-gradient-to-b from-card via-card to-card/80 dark:from-card dark:via-card dark:to-card/50 backdrop-blur-sm">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Create Contact</h2>
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 hover:bg-muted rounded-full transition-colors duration-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5 sm:space-y-6">
          {/* Folder Name */}
          <div className="space-y-2.5">
            <label htmlFor="folder-name" className="text-sm sm:text-base font-bold text-foreground block">
              Folder Name <span className="text-destructive">*</span>
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Friends, Suppliers, Team"
              maxLength={50}
              className="input-modern w-full"
              autoFocus
            />
            <p className="text-xs sm:text-sm text-muted-foreground text-right font-medium">{name.length}/50</p>
          </div>

          {/* Description */}
          <div className="space-y-2.5">
            <label htmlFor="folder-desc" className="text-sm sm:text-base font-bold text-foreground block">
              Description <span className="text-muted-foreground font-normal text-xs sm:text-sm">(Optional)</span>
            </label>
            <textarea
              id="folder-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a helpful description..."
              maxLength={200}
              rows={3}
              className="input-modern w-full resize-none"
            />
            <p className="text-xs sm:text-sm text-muted-foreground text-right font-medium">{description.length}/200</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 sm:p-5 bg-destructive/10 dark:bg-destructive/5 border border-destructive/20 rounded-2xl animate-fade-in-up">
              <p className="text-sm sm:text-base font-medium text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl border border-border bg-transparent hover:bg-muted transition-all duration-200 disabled:opacity-50 font-semibold text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold text-sm sm:text-base"
            >
              {isLoading && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />}
              <span>{isLoading ? "Creating..." : "Create"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
