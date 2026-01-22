"use client"

import { useState } from "react"
import { Folder, MoreVertical, Trash2, Edit2, FolderOpen } from "lucide-react"
import { useProfileFolders } from "@/hooks/useProfileFolders"

export default function FoldersList() {
  const walletAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null
  const { folders, isLoading, deleteFolder } = useProfileFolders(walletAddress)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (folderId: string) => {
    try {
      setDeletingId(folderId)
      await deleteFolder(folderId)
      setExpandedMenu(null)
      console.log('✅ [FoldersList] Folder deleted successfully')
    } catch (err) {
      console.error('❌ [FoldersList] Error deleting folder:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 sm:h-28 bg-muted/30 border border-border/50 rounded-2xl sm:rounded-3xl animate-shimmer"
          />
        ))}
      </div>
    )
  }

  if (folders.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-3xl border border-dashed border-border/50 bg-muted/20 dark:bg-muted/5 space-y-3">
        <div className="flex justify-center">
          <FolderOpen className="w-12 h-12 sm:w-14 sm:h-14 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm sm:text-base font-semibold text-muted-foreground">No contacts saved yet</p>
          <p className="text-xs sm:text-sm text-muted-foreground/70 mt-2">Create your first contact group to organize your transfers</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {folders.map((folder, idx) => (
        <div
          key={folder.id}
          className="group animate-fade-in-scale p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow-md"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-accent/20 transition-colors">
                <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {folder.name}
                </h3>
                {folder.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1.5">
                    {folder.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70 mt-2.5 font-medium">
                  Created {formatDate(folder.createdAt)}
                </p>
              </div>
            </div>

            {/* Menu Button */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setExpandedMenu(expandedMenu === folder.id ? null : folder.id)}
                className="p-2 sm:p-2.5 hover:bg-muted rounded-lg transition-colors duration-200"
                aria-label="Folder options"
              >
                <MoreVertical className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              {/* Dropdown Menu */}
              {expandedMenu === folder.id && (
                <div className="absolute right-0 top-full mt-2 bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden z-40 min-w-max animate-fade-in-scale">
                  <button className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-left text-xs sm:text-sm hover:bg-muted/50 flex items-center gap-2 text-foreground transition-colors font-medium">
                    <Edit2 className="w-4 h-4 flex-shrink-0" />
                    Edit
                  </button>
                  <div className="h-px bg-border/50" />
                  <button
                    onClick={() => handleDelete(folder.id)}
                    disabled={deletingId === folder.id}
                    className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-left text-xs sm:text-sm hover:bg-destructive/10 flex items-center gap-2 text-destructive transition-colors disabled:opacity-50 font-medium"
                  >
                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                    {deletingId === folder.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
