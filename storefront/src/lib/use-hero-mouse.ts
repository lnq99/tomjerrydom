"use client"

import { useCallback, useRef, useState } from "react"

export function useHeroMouse() {
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 })
  const rafRef = useRef<number | null>(null)

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect()
      setPos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      })
    })
  }, [])

  const onMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setPos({ x: 0.5, y: 0.5 })
  }, [])

  // Moves opposite to cursor — video layer appears to "breathe" with the mouse
  const parallaxStyle = (intensity = 1): React.CSSProperties => ({
    transform: `scale(1.07) translate(${(0.5 - pos.x) * 22 * intensity}px, ${(0.5 - pos.y) * 14 * intensity}px)`,
    transition: "transform 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    willChange: "transform",
  })

  // Soft radial glow that follows the cursor
  const glowStyle = (r = 255, g = 255, b = 255, a = 0.06): React.CSSProperties => ({
    background: `radial-gradient(520px circle at ${pos.x * 100}% ${pos.y * 100}%, rgba(${r},${g},${b},${a}) 0%, transparent 65%)`,
    pointerEvents: "none",
  })

  return { pos, onMouseMove, onMouseLeave, parallaxStyle, glowStyle }
}
