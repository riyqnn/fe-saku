"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Settings } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import ProfileCard from "@/components/profile/profile-card"
import FoldersList from "@/components/profile/folders-list"
import CreateFolderModal from "@/components/profile/create-folder-modal"

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [isShowCreateModal, setIsShowCreateModal] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const walletAddress = localStorage.getItem('walletAddress')
      if (!walletAddress) {
        router.push("/get-started")
        return
      }
      setIsCheckingAuth(false)
    }
    
    if (!isLoading) {
      checkAuth()
    }
  }, [isLoading])

  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Profile</h1>
          <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <ProfileCard />

        {/* Folders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Folders</h2>
            <button
              onClick={() => setIsShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Folder</span>
            </button>
          </div>

          <FoldersList />
        </div>
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isShowCreateModal}
        onClose={() => setIsShowCreateModal(false)}
      />
    </div>
  )
}
