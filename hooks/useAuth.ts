import { useState, useEffect } from 'react';

interface UserData {
  id: string;
  phone: string;
  name?: string;
  email?: string;
}

interface AuthResponse {
  success: boolean;
  action?: 'login' | 'register';
  walletAddress?: string;
  session?: any;
  user?: any;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);

  // Get current user from session on mount
  useEffect(() => {
    let isMounted = true;

    const getCurrentUser = async () => {
      try {
        setIsLoading(true);

        // Check if user is onboarded (wallet created)
        const isOnboarded = localStorage.getItem('isOnboarded');
        const walletAddress = localStorage.getItem('walletAddress');
        const phoneNumber = localStorage.getItem('phoneNumber');

        if (isMounted) {
          if (isOnboarded && walletAddress) {
            console.log('✅ [useAuth] User already onboarded with wallet:', walletAddress);
            setUser({
              id: 'wallet-' + walletAddress,
              phone: phoneNumber || '',
            });
          } else {
            console.log('❌ [useAuth] No onboarded user found');
            setUser(null);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    getCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Request OTP
  const requestOTP = async (phoneNumber: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📱 [useAuth] Requesting OTP for:', phoneNumber);

      const response = await fetch('/api/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [useAuth] OTP Request Error:', data.error);
        throw new Error(data.error || 'Failed to send OTP');
      }

      console.log('✅ [useAuth] OTP sent successfully');
      return { success: true };
    } catch (err: any) {
      console.error('❌ [useAuth] Request OTP Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and register wallet on-chain
  const verifyOTP = async (phoneNumber: string, otpCode: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔐 [useAuth] Starting OTP verification...');
      console.log('📱 [useAuth] Phone:', phoneNumber);
      console.log('🔑 [useAuth] OTP Code:', otpCode);

      // Call our new verify-otp endpoint that handles wallet generation on-chain
      const verifyResponse = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, otp: otpCode }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        console.error('❌ [useAuth] OTP Verification Error:', verifyData.error);
        throw new Error(verifyData.error || 'OTP verification failed');
      }

      console.log('✅ [useAuth] OTP verified and wallet registered on-chain!');
      console.log('👛 [useAuth] Wallet address:', verifyData.walletAddress);
      console.log('📝 [useAuth] Transaction hash:', verifyData.txHash);

      // Store wallet and private key locally (in production, use secure storage)
      localStorage.setItem('walletAddress', verifyData.walletAddress);
      localStorage.setItem('phoneNumber', phoneNumber);
      localStorage.setItem('walletCreatedAt', verifyData.walletCreatedAt || Date.now().toString());
      localStorage.setItem('isOnboarded', 'true');

      // Set user data
      setUser({
        id: 'wallet-' + verifyData.walletAddress,
        phone: phoneNumber,
      });

      return {
        success: true,
        action: verifyData.isNewRegistration ? 'register' : 'login',
        walletAddress: verifyData.walletAddress,
        user: { phone: phoneNumber },
      };
    } catch (err: any) {
      console.error('❌ [useAuth] Error:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('isOnboarded');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('walletCreatedAt');
    setUser(null);
    console.log('✅ [useAuth] User logged out');
  };

  return {
    requestOTP,
    verifyOTP,
    logout,
    isLoading,
    error,
    user,
  };
}
