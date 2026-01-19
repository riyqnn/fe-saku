import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface UserWalletData {
  walletAddress: string | null;
  phoneNumber: string | null;
  isVerified: boolean;
  balance: number; // IDRX balance
}

export function useUserWallet() {
  const [wallet, setWallet] = useState<UserWalletData>({
    walletAddress: null,
    phoneNumber: null,
    isVerified: false,
    balance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError('No session found');
          setIsLoading(false);
          return;
        }

        const userId = session.user.id;
        const userPhone = session.user.phone || session.user.user_metadata?.phone;

        console.log('📱 [useUserWallet] Fetching wallet for user:', userId);

        // Fetch user profile from DB
        const { data: profile, error: dbError } = await supabase
          .from('profiles')
          .select('wallet_address, phone_number, is_verified')
          .eq('id', userId)
          .single();

        if (dbError && dbError.code !== 'PGRST116') {
          console.error('❌ [useUserWallet] DB Error:', dbError);
          throw dbError;
        }

        if (!profile) {
          console.log('⚠️ [useUserWallet] No profile found');
          setWallet({
            walletAddress: null,
            phoneNumber: userPhone || null,
            isVerified: false,
            balance: 0,
          });
          setIsLoading(false);
          return;
        }

        console.log('✅ [useUserWallet] Profile loaded:', profile.wallet_address);

        setWallet({
          walletAddress: profile.wallet_address,
          phoneNumber: profile.phone_number || userPhone || null,
          isVerified: profile.is_verified,
          balance: 0, // TODO: fetch from blockchain
        });
      } catch (err: any) {
        console.error('❌ [useUserWallet] Error:', err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWallet();
  }, []);

  return {
    ...wallet,
    isLoading,
    error,
  };
}
