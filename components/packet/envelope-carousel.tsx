"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PacketTheme, PACKET_THEMES } from "@/lib/packet-themes"
import EnvelopeAnimation from "@/components/packet/envelope-animation"

interface EnvelopeCarouselProps {
  onEnvelopeClick: (theme: PacketTheme) => void
  onThemeChange: (theme: PacketTheme) => void
  isOpen: boolean
}

export default function EnvelopeCarousel({ onEnvelopeClick, onThemeChange, isOpen }: EnvelopeCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentTheme = PACKET_THEMES[currentIndex]

  useEffect(() => { 
    onThemeChange(currentTheme) 
  }, [currentIndex, onThemeChange, currentTheme])

  const goToPrevious = () => setCurrentIndex((prev) => (prev - 1 + PACKET_THEMES.length) % PACKET_THEMES.length)
  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % PACKET_THEMES.length)

  return (
    <div className="h-full flex flex-col items-center justify-between py-10 px-6 relative z-10">
      <div className="text-center space-y-1 pb-10">
        <h2 className="text-foreground text-2xl font-black tracking-tight">Pick a Design</h2>
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Swipe to explore themes</p>
      </div>

      <div className="relative w-full flex items-center justify-center min-h-[380px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
            className="w-full max-w-[280px] m-2"
          >
            <EnvelopeAnimation
              theme={currentTheme}
              isOpen={isOpen}
              onOpen={() => onEnvelopeClick(currentTheme)}
              size="custom"
            />
          </motion.div>
        </AnimatePresence>

        {!isOpen && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-lg border border-border flex items-center justify-center z-30 active:scale-90 transition-all"
            >
              <ChevronLeft className="w-6 h-6 text-primary" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-lg border border-border flex items-center justify-center z-30 active:scale-90 transition-all"
            >
              <ChevronRight className="w-6 h-6 text-primary" />
            </button>
          </>
        )}
      </div>

      <div className="text-center space-y-6 w-full pt-10">
        <div className="space-y-1">
          <p className="text-primary text-2xl font-black tracking-tighter">{currentTheme.name}</p>
          <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-[0.3em]">{currentTheme.description}</p>
        </div>

        <div className="flex justify-center gap-2">
          {PACKET_THEMES.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? "w-8 bg-primary" : "w-1.5 bg-primary/20"}`} />
          ))}
        </div>
      </div>
    </div>
  )
}