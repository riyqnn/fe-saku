"use client"

import { useState } from "react"
import { Folder, MoreVertical, Trash2, Edit2 } from "lucide-react"
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
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-card/50 border border-border rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (folders.length === 0) {
    return (
      <div className="p-8 text-center rounded-lg border border-dashed border-border bg-card/30">
        <Folder className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No folders yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Create your first folder to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="group p-4 rounded-lg border border-border bg-card/50 hover:border-primary/30 hover:bg-card/70 transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Folder className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {folder.name}
                </h3>
                {folder.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {folder.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70 mt-2">
                  Created {formatDate(folder.createdAt)}
                </p>
              </div>
            </div>

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={() => setExpandedMenu(expandedMenu === folder.id ? null : folder.id)}
                className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Dropdown Menu */}
              {expandedMenu === folder.id && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-40">
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 flex items-center gap-2 text-foreground transition-colors">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(folder.id)}
                    disabled={deletingId === folder.id}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-destructive/10 flex items-center gap-2 text-destructive transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
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
