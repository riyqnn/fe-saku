"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { PacketTheme } from "@/lib/packet-themes"

interface EnvelopeAnimationProps {
  theme: PacketTheme
  isOpen: boolean
  onOpen: () => void
  size?: "sm" | "md" | "lg" | "xl" | "custom"
  className?: string
}

export default function EnvelopeAnimation({
  theme,
  isOpen,
  onOpen,
  size = "custom",
  className = ""
}: EnvelopeAnimationProps) {
  const sizeClasses = {
    sm: "w-48 h-64",
    md: "w-64 h-80",
    lg: "w-80 h-96",
    xl: "w-96 h-[28rem]",
    custom: "w-full max-w-[450px] aspect-[3/4]"
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Envelope Container */}
      <div
        className={`${sizeClasses[size]} relative transition-transform hover:scale-102 active:scale-98`}
      >
        {/* Click overlay - ensures entire envelope is clickable */}
        {!isOpen && (
          <div
            onClick={onOpen}
            className="absolute inset-0 z-50 cursor-pointer"
            aria-label="Open envelope"
          />
        )}
        {/* Main Envelope Body */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            background: theme.colors.envelopeBg,
            borderRadius: "30px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
          }}
        >
          {/* Flap bagian atas - with opening animation */}
          <motion.div
            className="absolute top-0 left-0 right-0 origin-top z-20"
            style={{
              height: "40%",
              background: theme.colors.envelopeFlap,
              clipPath: "polygon(0 0, 100% 0, 50% 85%)",
              transformOrigin: "top center",
              transformStyle: "preserve-3d"
            }}
            animate={{ rotateX: isOpen ? -175 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: isOpen ? 0 : 0 }}
          />

          {/* Logo/Seal di tengah flap - Fully rounded with logo.png */}
          <motion.div
            className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
            animate={{ scale: isOpen ? 0 : 1, opacity: isOpen ? 0 : 1 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="rounded-full flex items-center justify-center relative overflow-hidden"
              style={{
                width: "70px",
                height: "70px",
                background: "white",
                boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)"
              }}
            >
              {/* Logo image - fully rounded */}
              <Image
                src="/logo.png"
                alt="Logo"
                width={60}
                height={60}
                className="object-contain"
                priority
              />
            </div>
          </motion.div>

          {/* Konten bagian bawah dengan ilustrasi */}
          <div className="absolute bottom-0 left-0 right-0 h-[65%] flex flex-col items-center justify-center pb-10 z-10 px-8">
            {/* Theme Image - decorative illustration */}
            {theme.image && (
              <div className="relative w-32 h-32 mb-4">
                <div className="absolute inset-0 bg-white/10 rounded-2xl backdrop-blur-sm" />
                <div className="absolute inset-2 flex items-center justify-center">
                  <theme.icon size={64} className="text-white/90 drop-shadow-lg" />
                </div>
              </div>
            )}

            {/* Decorative text pattern */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-0.5 bg-white/30 rounded-full" />
                <div className="w-2 h-2 bg-white/40 rounded-full" />
                <div className="w-8 h-0.5 bg-white/30 rounded-full" />
              </div>
              <p className="text-white/70 text-xs font-medium tracking-widest uppercase">
                {theme.description}
              </p>
            </div>
          </div>

          {/* Decorative dots */}
          <div
            className="absolute rounded-full z-5"
            style={{ width: "8px", height: "8px", top: "45%", left: "15%", background: "rgba(255, 255, 255, 0.3)" }}
          />
          <div
            className="absolute rounded-full z-5"
            style={{ width: "6px", height: "6px", top: "55%", right: "18%", background: "rgba(255, 255, 255, 0.3)" }}
          />
          <div
            className="absolute rounded-full z-5"
            style={{ width: "10px", height: "10px", bottom: "25%", left: "12%", background: "rgba(255, 255, 255, 0.3)" }}
          />
          <div
            className="absolute rounded-full z-5"
            style={{ width: "7px", height: "7px", bottom: "35%", right: "15%", background: "rgba(255, 255, 255, 0.3)" }}
          />
          <div
            className="absolute rounded-full z-5"
            style={{ width: "5px", height: "5px", top: "48%", right: "25%", background: "rgba(255, 255, 255, 0.3)" }}
          />

          {/* Sparkle effects */}
          <div
            className="absolute z-5"
            style={{ top: "50%", left: "8%", width: "15px", height: "15px", opacity: "0.6" }}
          >
            <svg width="100%" height="100%" viewBox="0 0 20 20">
              <rect width="20" height="3" y="8.5" fill="white" rx="2" />
              <rect width="3" height="20" x="8.5" fill="white" rx="2" />
            </svg>
          </div>
          <div
            className="absolute z-5"
            style={{ top: "58%", right: "12%", width: "18px", height: "18px", opacity: "0.7" }}
          >
            <svg width="100%" height="100%" viewBox="0 0 20 20">
              <rect width="20" height="3" y="8.5" fill="white" rx="2" />
              <rect width="3" height="20" x="8.5" fill="white" rx="2" />
            </svg>
          </div>
          <div
            className="absolute z-5"
            style={{ bottom: "30%", right: "20%", width: "12px", height: "12px", opacity: "0.5" }}
          >
            <svg width="100%" height="100%" viewBox="0 0 20 20">
              <rect width="20" height="3" y="8.5" fill="white" rx="2" />
              <rect width="3" height="20" x="8.5" fill="white" rx="2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
