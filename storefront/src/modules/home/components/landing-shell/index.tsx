"use client"

import { LandingThemeProvider } from "@lib/landing-theme"
import type { Slide } from "@lib/use-media-carousel"
import type { ReelItem } from "@lib/data/storefront-media"
import Hero from "@modules/home/components/hero"
import ThemeSwitcher from "@modules/home/components/theme-switcher"

interface LandingShellProps {
  children?: React.ReactNode
  heroSlides?: Slide[]
  reelItems?: ReelItem[]
}

export default function LandingShell({ children, heroSlides = [], reelItems = [] }: LandingShellProps) {
  return (
    <LandingThemeProvider heroSlides={heroSlides} reelItems={reelItems}>
      <Hero />
      <ThemeSwitcher />
      {children}
    </LandingThemeProvider>
  )
}
