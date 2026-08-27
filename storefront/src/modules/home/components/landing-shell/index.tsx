"use client"

import { LandingThemeProvider } from "@lib/landing-theme"
import Hero from "@modules/home/components/hero"
import ThemeSwitcher from "@modules/home/components/theme-switcher"

export default function LandingShell() {
  return (
    <LandingThemeProvider>
      <Hero />
      <ThemeSwitcher />
    </LandingThemeProvider>
  )
}
