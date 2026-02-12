"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence, PanInfo } from "framer-motion"
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
  const [direction, setDirection] = useState<"left" | "right" | null>(null)

  const currentTheme = PACKET_THEMES[currentIndex]

  // Notify parent of theme change
  useEffect(() => {
    onThemeChange(currentTheme)
  }, [currentIndex, onThemeChange])

  // Swipe handlers
  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const { offset } = info
    const threshold = 50

    if (offset.x < -threshold) {
      // Swipe left - next theme
      setDirection("left")
      setCurrentIndex((prev) => (prev + 1) % PACKET_THEMES.length)
    } else if (offset.x > threshold) {
      // Swipe right - previous theme
      setDirection("right")
      setCurrentIndex((prev) => (prev - 1 + PACKET_THEMES.length) % PACKET_THEMES.length)
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setDirection("right")
        setCurrentIndex((prev) => (prev - 1 + PACKET_THEMES.length) % PACKET_THEMES.length)
      } else if (e.key === "ArrowRight") {
        setDirection("left")
        setCurrentIndex((prev) => (prev + 1) % PACKET_THEMES.length)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Reset direction after animation
  useEffect(() => {
    if (direction !== null) {
      const timer = setTimeout(() => setDirection(null), 300)
      return () => clearTimeout(timer)
    }
  }, [direction])

  // Manual navigation
  const goToPrevious = () => {
    setDirection("right")
    setCurrentIndex((prev) => (prev - 1 + PACKET_THEMES.length) % PACKET_THEMES.length)
  }

  const goToNext = () => {
    setDirection("left")
    setCurrentIndex((prev) => (prev + 1) % PACKET_THEMES.length)
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header / Title */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-white text-xl font-bold mb-1">Select Your Packet Theme</h1>
          <p className="text-white/80 text-sm">Swipe or tap to choose</p>
        </motion.div>
      </div>

      {/* Main Envelope Display */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[450px] mx-auto relative">
          {/* Envelope Animation */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: direction === "left" ? 100 : direction === "right" ? -100 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction === "left" ? -100 : direction === "right" ? 100 : 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full"
            >
              <EnvelopeAnimation
                theme={currentTheme}
                isOpen={isOpen}
                onOpen={() => onEnvelopeClick(currentTheme)}
                size="custom"
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-14 h-14 -ml-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all z-30"
            disabled={isOpen}
          >
            <ChevronLeft className="w-7 h-7 text-white" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-14 h-14 mr-[-4rem] rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all z-30"
            disabled={isOpen}
          >
            <ChevronRight className="w-7 h-7 text-white" />
          </button>

          {/* Theme Name Below Envelope */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute -bottom-24 left-0 right-0 text-center z-20"
          >
            <p className="text-white text-2xl font-bold">{currentTheme.name}</p>
            <p className="text-white/80 text-sm">{currentTheme.description}</p>
          </motion.div>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center items-center gap-3">
        {PACKET_THEMES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className="transition-all"
          >
            <motion.div
              className="rounded-full"
              animate={{
                scale: index === currentIndex ? 1.2 : 1,
                width: index === currentIndex ? 32 : 12
              }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  backgroundColor: index === currentIndex ? "white" : "rgba(255,255,255,0.3)",
                  width: index === currentIndex ? "100%" : "12px"
                }}
              />
            </motion.div>
          </button>
        ))}
      </div>

      {/* Swipe hint */}
      <motion.div
        className="absolute bottom-24 left-0 right-0 z-20 flex justify-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <p className="text-white/60 text-xs flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 12L12 16M12 8L8 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Swipe to explore
        </p>
      </motion.div>
    </div>
  )
}
