"use client";

import { useState, useEffect, useCallback, useContext } from 'react';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  created_at: string;
  type: string;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const useNotificationsState = () => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    };

    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data: Notification[] = await response.json();
      setNotifications(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if(user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const markAllAsRead = async () => {
    if (!token) return;

    // Optimistically update UI
    const unreadNotifications = notifications.filter(n => !n.is_read);
    if (unreadNotifications.length === 0) return;

    const previousNotifications = [...notifications];
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));

    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });
      if (!response.ok) {
        // Revert optimistic update on failure
        setNotifications(previousNotifications);
        throw new Error('Failed to mark notifications as read');
      }
    } catch (err: any) {
      // Revert optimistic update on failure
      setNotifications(previousNotifications);
      setError(err.message);
    }
  };
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAllAsRead
  };
}

// You can create a provider if you want to use this hook in multiple places without re-fetching
// For now, using it directly is fine.

export const useNotifications = useNotificationsState;

