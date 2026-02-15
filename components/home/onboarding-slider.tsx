"use client"

import { useState, useEffect } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Pagination, Autoplay, Parallax } from "swiper/modules"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Image from "next/image"

import "swiper/css"
import "swiper/css/pagination"

const SAKU_ORANGE = "#F0A353"

const ONBOARDING_DATA = [
  {
    title: "Crypto Wallet,\nE-Wallet Simplicity.",
    description: "The power of blockchain meets the ease of your favorite payment app. No complex seed phrases, just your phone number.",
    image: "/landing/card1.png",
    accent: "Next-Gen Protocol"
  },
  {
    title: "Split Bills,\nZero Drama.",
    description: "Done with dinner? Settle up in seconds with friends. Clean, poetic logic for shared expenses.",
    image: "/landing/card2.png",
    accent: "Social Finance"
  },
  {
    title: "Saku Packets,\nInstant Joy.",
    description: "Send digital gift packets or pay anywhere with our seamless QRIS-ready scanner. Crypto made useful.",
    image: "/landing/card3.png",
    accent: "Daily Utility"
  }
]

export default function OnboardingSlider() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("saku_has_seen_onboarding")
    const isNewRegistration = localStorage.getItem("saku_just_registered")

    if (!hasSeenOnboarding && isNewRegistration) {
      setIsOpen(true)
      document.body.style.overflow = 'hidden'
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem("saku_has_seen_onboarding", "true")
    localStorage.removeItem("saku_just_registered")
    document.body.style.overflow = 'unset'
    setIsOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[100] bg-white flex flex-col font-sans"
        >
          {/* Top Progress Indicators */}
          <div className="max-w-lg mx-auto absolute top-0 left-0 right-0 z-[110] flex gap-1.5 p-5">
            {ONBOARDING_DATA.map((_, i) => (
              <div key={i} className="h-[3px] flex-grow bg-zinc-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: activeIndex >= i ? "100%" : "0%" }}
                  className="h-full"
                  style={{ backgroundColor: SAKU_ORANGE }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              </div>
            ))}
          </div>

          <div className="w-full max-w-lg mx-auto h-full flex flex-col relative overflow-hidden bg-[#FFFCF9]">
            
            {/* Background Soft Glow */}
            <div 
              className="absolute top-[-10%] right-[-10%] w-[80%] aspect-square rounded-full blur-[120px] opacity-20" 
              style={{ backgroundColor: SAKU_ORANGE }}
            />

            <Swiper
              modules={[Pagination, Autoplay, Parallax]}
              parallax={true}
              onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
              autoplay={{ delay: 5500 }}
              className="w-full h-full"
            >
              {ONBOARDING_DATA.map((item, index) => (
                <SwiperSlide key={index} className="flex flex-col px-8 pt-28">
                  <div className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={`accent-${activeIndex}`}
                    >
                      <span 
                        className="text-[10px] font-black uppercase tracking-[0.3em]"
                        style={{ color: SAKU_ORANGE }}
                      >
                        {item.accent}
                      </span>
                    </motion.div>
                    
                    <motion.h2 
                      data-swiper-parallax="-300"
                      className="text-5xl font-bold tracking-tighter text-zinc-900 leading-[1.0] py-1"
                    >
                      {item.title.split('\n').map((line, i) => (
                        <span key={i} className="block">{line}</span>
                      ))}
                    </motion.h2>

                    <motion.p 
                      data-swiper-parallax="-150"
                      className="text-zinc-500 text-lg font-light leading-relaxed max-w-[280px]"
                    >
                      {item.description}
                    </motion.p>
                  </div>

                  {/* Smaller, Focused Image with Floating Animation */}
                  <motion.div 
                    data-swiper-parallax="-400"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-40 h-40 mt-4 mb-24 self-center"
                  >
                    <Image 
                      src={item.image} 
                      alt="Icon" 
                      fill 
                      className="object-contain drop-shadow-[0_20px_40px_rgba(240,163,83,0.2)]"
                    />
                  </motion.div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Bottom Interaction Area */}
            <div className="p-8 pb-12 bg-white/50 backdrop-blur-sm flex flex-col items-center border-t border-zinc-50">
              <Button 
                onClick={handleClose}
                style={{ backgroundColor: SAKU_ORANGE }}
                className="w-full h-16 rounded-2xl text-white hover:opacity-90 transition-all group flex items-center justify-between px-8 text-lg font-bold shadow-lg shadow-[#F0A353]/20"
              >
                <span>Explore Saku</span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  <ArrowRight className="w-6 h-6 stroke-[3px]" />
                </motion.div>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}