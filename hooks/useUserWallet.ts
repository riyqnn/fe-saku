// import { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabaseClient';

// export function useUserWallet() {
//   const [profile, setProfile] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function getProfile() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user) {
//         const { data } = await supabase
//           .from('profiles')
//           .select('wallet_address, full_name, is_verified')
//           .eq('id', user.id)
//           .single();
//         setProfile(data);
//       }
//       setLoading(false);
//     }
//     getProfile();
//   }, []);

//   return { profile, loading };
// }

//yg atas sbnrnya sam aaja kaya di useauth cuma ini khusus ambil profile wallet doang

"use client"

import { useAuth } from './useAuth';

export function useUserWallet() {
  const { user, isLoading } = useAuth();

  return { 
    profile: user, 
    loading: isLoading 
  };
}