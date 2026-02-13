"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface MyPacket {
  id: string;
  packet_code: string;
  total_amount: number;
  max_winners: number;
  winner_count: number;
  status: string;
  created_at: string;
  shareLink: string;
  isExpired: boolean;
  isFullyClaimed: boolean;
}

interface UseMyPacketsReturn {
  packets: MyPacket[];
  isLoading: boolean;
  error: string | null;
  fetchPackets: () => Promise<void>;
}

export function useMyPackets(): UseMyPacketsReturn {
  const { token, user } = useAuth();
  const [packets, setPackets] = useState<MyPacket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackets = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/packet/my-packets', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch created packets');
      }
      setPackets(data.packets || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      fetchPackets();
    }
  }, [user, fetchPackets]);

  return { packets, isLoading, error, fetchPackets };
}
