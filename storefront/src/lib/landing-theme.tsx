"use client"

import { createContext, useContext, useState, useEffect } from "react"

export type DesignKey = "cinema" | "razvorot" | "afisha" | "sloy"

export interface LandingTheme {
  key: string
  name: string
  design: DesignKey
  // Overlay / panel colors (usage varies per design)
  overlay: string
  overlayBottom: string
  panelBg: string       // razvorot: solid left panel; afisha: vignette base color
  cardBg: string        // sloy: glass card background
  cardBorder: string    // sloy: glass card border
  // Text
  headlineColor: string
  subtitleColor: string
  bodyColor: string
  eyebrowColor: string
  // CTAs
  ctaPrimary: { bg: string; text: string }
  ctaSecondary: { border: string; text: string }
  // Indicators
  indicatorActive: string
  indicatorInactive: string
  scrollHint: string
}

export const themes: LandingTheme[] = [
  {
    key: "cinema",
    name: "Кино",
    design: "cinema",
    overlay:
      "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.52) 45%, rgba(0,0,0,0.18) 100%)",
    overlayBottom:
      "linear-gradient(to top, rgba(0,0,0,0.60) 0%, transparent 100%)",
    panelBg: "#0a0a0a",
    cardBg: "rgba(0,0,0,0.55)",
    cardBorder: "rgba(255,255,255,0.12)",
    headlineColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.68)",
    bodyColor: "rgba(255,255,255,0.62)",
    eyebrowColor: "rgba(255,255,255,0.50)",
    ctaPrimary: { bg: "#ffffff", text: "#000000" },
    ctaSecondary: { border: "rgba(255,255,255,0.38)", text: "#ffffff" },
    indicatorActive: "#ffffff",
    indicatorInactive: "rgba(255,255,255,0.32)",
    scrollHint: "rgba(255,255,255,0.48)",
  },
  {
    key: "amber",
    name: "Янтарь",
    design: "razvorot",
    overlay:
      "linear-gradient(to right, rgba(110,42,0,0.90) 0%, rgba(60,20,0,0.55) 50%, transparent 100%)",
    overlayBottom:
      "linear-gradient(to top, rgba(70,25,0,0.65) 0%, transparent 100%)",
    panelBg: "#120800",
    cardBg: "rgba(110,42,0,0.52)",
    cardBorder: "rgba(255,155,33,0.20)",
    headlineColor: "#FFD580",
    subtitleColor: "#FF9020",
    bodyColor: "rgba(255,210,140,0.80)",
    eyebrowColor: "rgba(255,175,70,0.58)",
    ctaPrimary: { bg: "#FF9B21", text: "#1A0800" },
    ctaSecondary: { border: "rgba(255,155,33,0.48)", text: "#FFD080" },
    indicatorActive: "#FF9B21",
    indicatorInactive: "rgba(255,155,33,0.32)",
    scrollHint: "rgba(255,155,33,0.52)",
  },
  {
    key: "ice",
    name: "Лёд",
    design: "afisha",
    overlay:
      "radial-gradient(ellipse 90% 85% at 50% 48%, rgba(0,12,35,0.88) 0%, rgba(0,8,25,0.52) 55%, rgba(0,5,15,0.22) 100%)",
    overlayBottom:
      "linear-gradient(to top, rgba(0,12,45,0.72) 0%, transparent 100%)",
    panelBg: "rgba(0,12,35,0.78)",
    cardBg: "rgba(0,18,55,0.42)",
    cardBorder: "rgba(80,170,255,0.18)",
    headlineColor: "#E8F6FF",
    subtitleColor: "#5BB8FF",
    bodyColor: "rgba(175,220,255,0.75)",
    eyebrowColor: "rgba(140,200,255,0.52)",
    ctaPrimary: { bg: "#3DAAFF", text: "#001020" },
    ctaSecondary: { border: "rgba(80,170,255,0.42)", text: "#A8DAFF" },
    indicatorActive: "#3DAAFF",
    indicatorInactive: "rgba(80,170,255,0.32)",
    scrollHint: "rgba(80,170,255,0.52)",
  },
  {
    key: "graf",
    name: "Граффити",
    design: "sloy",
    overlay:
      "linear-gradient(160deg, rgba(10,0,0,0.22) 0%, rgba(15,0,0,0.45) 55%, rgba(25,0,0,0.65) 100%)",
    overlayBottom:
      "linear-gradient(to top, rgba(40,0,0,0.70) 0%, transparent 100%)",
    panelBg: "#0f0000",
    cardBg: "rgba(20,0,0,0.55)",
    cardBorder: "rgba(255,60,60,0.22)",
    headlineColor: "#ffffff",
    subtitleColor: "#FF3B3B",
    bodyColor: "rgba(255,188,188,0.76)",
    eyebrowColor: "rgba(255,145,145,0.52)",
    ctaPrimary: { bg: "#FF2E2E", text: "#ffffff" },
    ctaSecondary: { border: "rgba(255,60,60,0.42)", text: "#FFAAAA" },
    indicatorActive: "#FF2E2E",
    indicatorInactive: "rgba(255,60,60,0.32)",
    scrollHint: "rgba(255,60,60,0.52)",
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
