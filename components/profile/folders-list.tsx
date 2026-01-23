"use client"

import { useState } from "react"
import { 
  Folder, MoreVertical, Trash2, Edit2, FolderOpen, 
  X, Loader2, Plus, Smartphone 
} from "lucide-react"
import { useProfileFolders } from "@/hooks/useProfileFolders"

export default function FoldersManager() {
  // 1. Single Hook Call (Efisien!)
  const walletAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null
  const { folders, isLoading, createFolder, deleteFolder } = useProfileFolders(walletAddress)

  // 2. UI States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 3. Form States (untuk Modal)
  const [formData, setFormData] = useState({ name: "", description: "" })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- Handlers ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return setFormError("Folder name is required")
    
    setIsSubmitting(true)
    try {
      await createFolder(formData.name, formData.description)
      setFormData({ name: "", description: "" })
      setIsModalOpen(false)
      setFormError(null)
    } catch (err: any) {
      setFormError(err.message || "Failed to create folder")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (folderId: string) => {
    try {
      setDeletingId(folderId)
      await deleteFolder(folderId)
      setExpandedMenu(null)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    const diffMs = new Date().getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 24) return `${diffHours || 1}h ago`
    return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* HEADER: Title & Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">My Contacts</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New
        </button>
      </div>

      {/* LIST SECTION */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted/30 border border-border/50 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : folders.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border/50 bg-muted/5 space-y-3">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium text-sm">No contacts saved yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {folders.map((folder, idx) => (
            <div
              key={folder.id}
              className="group p-4 sm:p-5 rounded-3xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {folder.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{folder.description || "No description"}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2 font-medium uppercase tracking-wider">
                      Created {formatDate(folder.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Dropdown Menu */}
                <div className="relative">
                  <button onClick={() => setExpandedMenu(expandedMenu === folder.id ? null : folder.id)} className="p-2 hover:bg-muted rounded-lg">
                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                  </button>
                  {expandedMenu === folder.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-card border border-border/50 rounded-2xl shadow-xl z-50 overflow-hidden">
                      <button className="w-full px-4 py-2.5 text-left text-xs hover:bg-muted flex items-center gap-2">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(folder.id)}
                        disabled={deletingId === folder.id}
                        className="w-full px-4 py-2.5 text-left text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
                      >
                        {deletingId === folder.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/20">
          <div className="bg-card border border-border/50 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/30">
              <h2 className="font-bold">Create New Contact</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Folder Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. My Family"
                  className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional details..."
                  className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none resize-none h-24"
                />
              </div>

              {formError && <p className="text-xs text-destructive font-medium">{formError}</p>}

              <button
                type="submit"
                disabled={isSubmitting || !formData.name}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Create Folder
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}