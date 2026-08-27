"use client"

import { createContext, useContext, useState, useEffect } from "react"

export type DesignKey = "cinema" | "razvorot" | "afisha" | "sloy"

export interface LandingTheme {
  key: string
  name: string
  design: DesignKey
  overlay: string
  overlayBottom: string
  panelBg: string
  cardBg: string
  cardBorder: string
  headlineColor: string
  subtitleColor: string
  bodyColor: string
  eyebrowColor: string
  ctaPrimary: { bg: string; text: string }
  ctaSecondary: { border: string; text: string }
  indicatorActive: string
  indicatorInactive: string
  scrollHint: string
}

export const themes: LandingTheme[] = [
  {
    // Диагональ — constructivist geometry. Off-white type, rust-red accent.
    key: "diagonal",
    name: "Диагональ",
    design: "cinema",
    overlay: "none",
    overlayBottom: "none",
    panelBg: "#0e0d0c",
    cardBg: "rgba(14,13,12,0.7)",
    cardBorder: "rgba(210,65,26,0.20)",
    headlineColor: "#EDE9E0",
    subtitleColor: "#D4411A",
    bodyColor: "rgba(237,233,224,0.60)",
    eyebrowColor: "rgba(237,233,224,0.38)",
    ctaPrimary: { bg: "#D4411A", text: "#EDE9E0" },
    ctaSecondary: { border: "rgba(237,233,224,0.30)", text: "#EDE9E0" },
    indicatorActive: "#D4411A",
    indicatorInactive: "rgba(237,233,224,0.22)",
    scrollHint: "rgba(237,233,224,0.40)",
  },
  {
    // Полоса — full-opacity video, opaque band across the middle.
    // Pitch black band, stark white type, olive-green accent.
    key: "polosa",
    name: "Полоса",
    design: "razvorot",
    overlay: "none",
    overlayBottom: "none",
    panelBg: "#0a0a0a",
    cardBg: "rgba(10,10,10,0.85)",
    cardBorder: "rgba(185,195,105,0.18)",
    headlineColor: "#F5F4F0",
    subtitleColor: "#B9C369",
    bodyColor: "rgba(245,244,240,0.55)",
    eyebrowColor: "rgba(245,244,240,0.35)",
    ctaPrimary: { bg: "#B9C369", text: "#0a0a0a" },
    ctaSecondary: { border: "rgba(245,244,240,0.28)", text: "#F5F4F0" },
    indicatorActive: "#B9C369",
    indicatorInactive: "rgba(245,244,240,0.20)",
    scrollHint: "rgba(245,244,240,0.35)",
  },
  {
    // Обложка — editorial column, backdrop-blur only (no solid left panel).
    // Warm charcoal overlay, cream type, teal-green accent.
    key: "oblozhka",
    name: "Обложка",
    design: "afisha",
    overlay: "none",
    overlayBottom: "none",
    panelBg: "rgba(18,16,14,0.0)",
    cardBg: "rgba(18,16,14,0.55)",
    cardBorder: "rgba(90,185,160,0.18)",
    headlineColor: "#EAE5D8",
    subtitleColor: "#5AB9A0",
    bodyColor: "rgba(234,229,216,0.60)",
    eyebrowColor: "rgba(234,229,216,0.40)",
    ctaPrimary: { bg: "#5AB9A0", text: "#121410" },
    ctaSecondary: { border: "rgba(234,229,216,0.28)", text: "#EAE5D8" },
    indicatorActive: "#5AB9A0",
    indicatorInactive: "rgba(234,229,216,0.22)",
    scrollHint: "rgba(234,229,216,0.38)",
  },
  {
    // Вывеска — hollow outlined type over full video.
    // Near-black strip, off-white outline, warm amber accent.
    key: "vyveska",
    name: "Вывеска",
    design: "sloy",
    overlay: "none",
    overlayBottom: "none",
    panelBg: "#0c0b09",
    cardBg: "rgba(12,11,9,0.7)",
    cardBorder: "rgba(220,165,50,0.18)",
    headlineColor: "#EDEBE5",
    subtitleColor: "#DCA532",
    bodyColor: "rgba(237,235,229,0.58)",
    eyebrowColor: "rgba(237,235,229,0.36)",
    ctaPrimary: { bg: "#DCA532", text: "#0c0b09" },
    ctaSecondary: { border: "rgba(237,235,229,0.28)", text: "#EDEBE5" },
    indicatorActive: "#DCA532",
    indicatorInactive: "rgba(237,235,229,0.20)",
    scrollHint: "rgba(237,235,229,0.36)",
  },
]

interface LandingThemeCtx {
  theme: LandingTheme
  themeIndex: number
  cycle: () => void
}

const LandingThemeContext = createContext<LandingThemeCtx>({
  theme: themes[0],
  themeIndex: 0,
  cycle: () => {},
})

export function LandingThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem("landing-theme-idx")
    if (saved !== null) {
      const idx = parseInt(saved, 10)
      if (!isNaN(idx)) setThemeIndex(idx % themes.length)
    }
  }, [])

  const cycle = () => {
    setThemeIndex((i) => {
      const next = (i + 1) % themes.length
      localStorage.setItem("landing-theme-idx", String(next))
      return next
    })
  }

  return (
    <LandingThemeContext.Provider value={{ theme: themes[themeIndex], themeIndex, cycle }}>
      {children}
    </LandingThemeContext.Provider>
  )
}

export function useLandingTheme() {
  return useContext(LandingThemeContext)
}
