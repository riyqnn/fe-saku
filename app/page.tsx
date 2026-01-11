"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import BalanceCard from "@/components/home/balance-card"
import SearchBar from "@/components/home/search-bar"
import RecentTransfers from "@/components/home/recent-transfer"
import PayButton from "@/components/home/pay-button"
import TransferModal from "@/components/transfer/transfer-modal"

export default function Home() {
  const router = useRouter()
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    const isOnboarded = localStorage.getItem('isOnboarded') === 'true'
    if (!isOnboarded) {
      router.push('/get-started')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary/5 to-transparent pt-4 px-4 pb-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-foreground">BayarDulu</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 space-y-6">
        {/* Balance Card */}
        <BalanceCard balance={1250000} />

        {/* Search Bar */}
        <SearchBar onPayClick={() => setShowTransferModal(true)} />

        {/* Recent Transfers */}
        <RecentTransfers />
      </main>

      {/* FAB */}
      <PayButton onClick={() => setShowTransferModal(true)} />

      {/* Transfer Modal */}
      {showTransferModal && <TransferModal onClose={() => setShowTransferModal(false)} />}
    </div>
  )
}

// 'use client';
// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// // Ganti baris ini:
// import { createBrowserClient } from '@supabase/ssr';

// export default function Home() {
//   const supabase = createBrowserClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//     );
//   const router = useRouter();

//   const [session, setSession] = useState<any>(null);
//   const [phone, setPhone] = useState('');
//   const [otp, setOtp] = useState('');
//   const [step, setStep] = useState<'phone' | 'otp'>('phone');
//   const [loading, setLoading] = useState(false);
//   const [wallet, setWallet] = useState<string | null>(null);

//   // Cek Session saat load
//   useEffect(() => {
//     const checkUser = async () => {
//       const { data } = await supabase.auth.getSession();
//       if (data.session) {
//         setSession(data.session);
//         fetchWallet(data.session.user.id);
//       }
//     };
//     checkUser();
//   }, []);

//   const fetchWallet = async (userId: string) => {
//     const { data } = await supabase.from('profiles').select('wallet_address').eq('id', userId).single();
//     if (data?.wallet_address) setWallet(data.wallet_address);
//   };

//   // 1. Kirim OTP
//   const sendOtp = async () => {
//     setLoading(true);
//     const { error } = await supabase.auth.signInWithOtp({ phone });
//     setLoading(false);
//     if (error) alert(error.message);
//     else setStep('otp');
//   };

//   // 2. Verifikasi OTP & Trigger Setup Wallet
//   const verifyOtp = async () => {
//     setLoading(true);
//     const { error, data } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    
//     if (error) {
//       alert("OTP Salah");
//       setLoading(false);
//       return;
//     }

//     // Login Sukses -> Panggil Backend buat setup blockchain
//     try {
//       const res = await fetch('/api/setup-wallet', { method: 'POST' });
//       const result = await res.json();
      
//       if (result.success || result.address) {
//         setWallet(result.address);
//         setSession(data.session);
//         router.refresh();
//       }
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     setSession(null);
//     setWallet(null);
//     setStep('phone');
//   };

//   // TAMPILAN DASHBOARD
//   if (session && wallet) {
//     return (
//       <div className="p-10 max-w-md mx-auto border rounded-xl shadow-lg mt-10">
//         <h1 className="text-2xl font-bold mb-4">Dompet SakuApp 🚀</h1>
//         <div className="bg-gray-100 p-4 rounded mb-4 break-all">
//           <p className="text-sm text-gray-500">Nomor HP:</p>
//           <p className="font-mono font-bold">{session.user.phone}</p>
//         </div>
//         <div className="bg-blue-50 p-4 rounded mb-6 break-all">
//           <p className="text-sm text-blue-500">Wallet Address:</p>
//           <p className="font-mono text-sm">{wallet}</p>
//         </div>
        
//         <button 
//           onClick={() => alert("Fitur transfer diimplementasikan via API Route /transfer")}
//           className="w-full bg-green-600 text-white py-3 rounded-lg font-bold mb-2"
//         >
//           Kirim IDRX
//         </button>
//         <button onClick={handleLogout} className="w-full bg-red-500 text-white py-2 rounded-lg">
//           Logout
//         </button>
//       </div>
//     );
//   }

//   // TAMPILAN LOGIN
//   return (
//     <div className="flex justify-center items-center min-h-screen bg-gray-50">
//       <div className="p-8 bg-white rounded-xl shadow-md w-full max-w-sm">
//         <h2 className="text-xl font-bold mb-6 text-center">Login SakuApp</h2>
        
//         {step === 'phone' ? (
//           <>
//             <input 
//               className="w-full border p-3 rounded mb-4" 
//               placeholder="+62812345..." 
//               value={phone} 
//               onChange={e => setPhone(e.target.value)} 
//             />
//             <button 
//               onClick={sendOtp} 
//               disabled={loading}
//               className="w-full bg-blue-600 text-white p-3 rounded font-bold"
//             >
//               {loading ? 'Mengirim...' : 'Kirim Kode Masuk'}
//             </button>
//           </>
//         ) : (
//           <>
//             <input 
//               className="w-full border p-3 rounded mb-4 text-center tracking-widest text-xl" 
//               placeholder="123456" 
//               value={otp} 
//               onChange={e => setOtp(e.target.value)} 
//             />
//             <button 
//               onClick={verifyOtp} 
//               disabled={loading}
//               className="w-full bg-green-600 text-white p-3 rounded font-bold"
//             >
//               {loading ? 'Memproses Blockchain...' : 'Verifikasi'}
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }