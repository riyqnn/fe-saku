"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { PacketTheme, PACKET_THEMES } from "@/lib/packet-themes"
import EnvelopeAnimation from "./envelope-animation"

interface PacketTypeSelectorProps {
  selectedTheme: PacketTheme | null
  onSelectTheme: (theme: PacketTheme) => void
  className?: string
}

export default function PacketTypeSelector({
  selectedTheme,
  onSelectTheme,
  className = ""
}: PacketTypeSelectorProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
          Choose Your Packet Style
        </h2>
        <p className="text-white/80 text-sm drop-shadow">
          Select a theme for your special packet
        </p>
      </motion.div>

      {/* Theme Grid - Horizontal Scroll on Mobile */}
      <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory">
        {PACKET_THEMES.map((theme, index) => {
          const Icon = theme.icon
          const isSelected = selectedTheme?.id === theme.id

          return (
            <motion.button
              key={theme.id}
              onClick={() => onSelectTheme(theme)}
              className={`
                flex-shrink-0 w-36 snap-center
                rounded-3xl p-4
                transition-all duration-300
                ${isSelected
                  ? 'ring-4 ring-white shadow-2xl scale-105'
                  : 'hover:scale-102 shadow-xl'
                }
              `}
              style={{
                background: theme.colors.envelopeBg,
                boxShadow: isSelected
                  ? `0 20px 40px ${theme.colors.accent}60`
                  : `0 10px 30px ${theme.colors.accent}40`
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              {/* Selection Badge */}
              {isSelected && (
                <motion.div
                  className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg z-10"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <Check size={18} className="text-green-500" strokeWidth={3} />
                </motion.div>
              )}

              {/* Mini Envelope Preview */}
              <div className="relative w-full aspect-[3/4] mb-3">
                {/* Mini envelope representation */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-inner">
                  {/* Mini flap */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[40%]"
                    style={{
                      background: theme.colors.envelopeFlap,
                      clipPath: "polygon(0 0, 100% 0, 50% 85%)"
                    }}
                  />

                  {/* Mini seal */}
                  <div
                    className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                    style={{ backgroundColor: theme.colors.seal }}
                  >
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <Icon size={14} style={{ color: theme.colors.seal }} />
                    </div>
                  </div>

                  {/* Sparkle decoration */}
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-3"
                      style={{
                        top: ["45%", "60%"][i],
                        left: ["20%", "70%"][i]
                      }}
                    >
                      <svg viewBox="0 0 12 12" className="w-full h-full opacity-60">
                        <rect width="12" height="2" y="5" fill="white" rx="1" />
                        <rect width="2" height="12" x="5" fill="white" rx="1" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme Info */}
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Icon size={16} className="text-white drop-shadow" />
                </div>
                <p className="text-white font-bold text-sm drop-shadow">
                  {theme.name}
                </p>
                <p className="text-white/70 text-xs drop-shadow">
                  {theme.description}
                </p>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Continue Button Hint */}
      {selectedTheme && (
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-white/80 text-sm drop-shadow">
            ✓ <span className="font-bold">{selectedTheme.name}</span> selected
          </p>
          <p className="text-white/60 text-xs mt-1">
            Continue to create your packet
          </p>
        </motion.div>
      )}
    </div>
  )
}
