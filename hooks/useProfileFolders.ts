import { useState, useEffect } from 'react';

export interface Folder {
  id: string;
  name: string;
  description: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'saku_folders';

export function useProfileFolders(walletAddress: string | null) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load folders from localStorage
  const loadFolders = () => {
    try {
      if (!walletAddress) {
        setFolders([]);
        setIsLoading(false);
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      const allFolders = stored ? JSON.parse(stored) : [];
      
      // Filter folders for current wallet
      const userFolders = allFolders.filter(
        (f: Folder) => f.walletAddress === walletAddress
      );
      
      console.log('✅ [useProfileFolders] Loaded', userFolders.length, 'folders for wallet:', walletAddress);
      setFolders(userFolders);
      setError(null);
    } catch (err: any) {
      console.error('❌ [useProfileFolders] Error loading folders:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new folder
  const createFolder = async (name: string, description: string) => {
    try {
      if (!walletAddress) throw new Error('No wallet connected');

      setIsLoading(true);
      const newFolder: Folder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        walletAddress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const stored = localStorage.getItem(STORAGE_KEY);
      const allFolders = stored ? JSON.parse(stored) : [];
      allFolders.push(newFolder);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(allFolders));
      
      console.log('✅ [useProfileFolders] Created folder:', newFolder.id, newFolder.name);
      
      // Reload folders
      loadFolders();
      
      return newFolder;
    } catch (err: any) {
      console.error('❌ [useProfileFolders] Error creating folder:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update folder
  const updateFolder = async (folderId: string, name: string, description: string) => {
    try {
      if (!walletAddress) throw new Error('No wallet connected');

      setIsLoading(true);
      const stored = localStorage.getItem(STORAGE_KEY);
      const allFolders = stored ? JSON.parse(stored) : [];

      const folderIndex = allFolders.findIndex((f: Folder) => f.id === folderId);
      if (folderIndex === -1) throw new Error('Folder not found');

      allFolders[folderIndex] = {
        ...allFolders[folderIndex],
        name,
        description,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(allFolders));
      
      console.log('✅ [useProfileFolders] Updated folder:', folderId);
      
      loadFolders();
    } catch (err: any) {
      console.error('❌ [useProfileFolders] Error updating folder:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete folder
  const deleteFolder = async (folderId: string) => {
    try {
      if (!walletAddress) throw new Error('No wallet connected');

      setIsLoading(true);
      const stored = localStorage.getItem(STORAGE_KEY);
      const allFolders = stored ? JSON.parse(stored) : [];

      const filtered = allFolders.filter((f: Folder) => f.id !== folderId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      
      console.log('✅ [useProfileFolders] Deleted folder:', folderId);
      
      loadFolders();
    } catch (err: any) {
      console.error('❌ [useProfileFolders] Error deleting folder:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [walletAddress]);

  return {
    folders,
    isLoading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch: loadFolders,
  };
}
