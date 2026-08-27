"use client"

import { useLandingTheme, type DesignKey } from "@lib/landing-theme"
import CinemaHero from "./designs/cinema"
import RazvorotHero from "./designs/razvorot"
import AfishaHero from "./designs/afisha"
import SloyHero from "./designs/sloy"

const designs: Record<DesignKey, React.ComponentType> = {
  cinema: CinemaHero,
  razvorot: RazvorotHero,
  afisha: AfishaHero,
  sloy: SloyHero,
}

export default function Hero() {
  const { theme } = useLandingTheme()
  const Design = designs[theme.design]
  return <Design />
}
