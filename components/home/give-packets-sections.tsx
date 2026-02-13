"use client"

import { Gift, ArrowRight, Sparkles, Crown } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export default function GiftPacketsSection({ packets }: { packets: any[] }) {
  const router = useRouter()

  if (!packets || packets.length === 0) return null

  return (
    <div className="px-6 mb-10 relative">
      <div className="flex items-center justify-between mb-5 px-2">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-black  tracking-[0.2em] text-secondary flex items-center gap-2">
            <Sparkles size={12} className="animate-pulse" /> Exclusive Gifts
          </h2>
          <p className="text-xl font-black tracking-tighter text-foreground">Waiting for you</p>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
            <Gift size={20} className="text-white" />
        </div>
      </div>

      <div className="space-y-4">
        {packets.map((packet, index) => {
          const creatorName = packet.creator?.full_name || "Saku User";
          const displayWallet = `${packet.creator_wallet_address.slice(0, 6)}...${packet.creator_wallet_address.slice(-4)}`;

          return (
            <motion.div
              key={packet.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => router.push(`/packet/claim/${packet.packet_code}`)}
                className="group relative w-full overflow-hidden bg-white rounded-[2.5rem] p-1 border border-border shadow-2xl shadow-primary/5 active:scale-95 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
                
                <div className="relative z-10 flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-primary to-saku-orange rounded-3xl flex items-center justify-center text-white shadow-xl shadow-primary/20 group-hover:rotate-6 transition-transform">
                        <Gift size={28} />
                      </div>
                      <motion.div 
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-2 -left-2 bg-saku-yellow p-1.5 rounded-full border-2 border-white shadow-md"
                      >
                        <Crown size={10} className="text-white" />
                      </motion.div>
                    </div>

                    <div className="text-left">
                      <h4 className="text-sm font-black text-foreground tracking-tight flex items-center gap-1">
                        USDC Fortune Box
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                      </h4>
                      {/* INI PERBAIKANNYA: Pake creatorName hasil join */}
                      <p className="text-[10px] font-bold text-muted-foreground  tracking-widest mt-0.5">
                        From: <span className="text-primary font-black">
                          {creatorName}
                        </span>
                        {/* <span className="ml-1 opacity-40">({displayWallet})</span> */}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 bg-foreground text-white px-5 py-3 rounded-2xl text-[10px] font-black  tracking-widest group-hover:bg-primary transition-colors">
                      Claim <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                  </div>
                </div>

                <div className="h-1 w-full bg-muted/30">
                  <div 
                      className="h-full bg-primary/20" 
                      style={{ width: `${(packet.winner_count / packet.max_winners) * 100}%` }} 
                  />
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  )
}