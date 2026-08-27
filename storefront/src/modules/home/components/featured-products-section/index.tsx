"use client"

import { useLandingTheme } from "@lib/landing-theme"

export default function FeaturedProductsSection({ children }: { children: React.ReactNode }) {
  const { theme } = useLandingTheme()

  return (
    <section style={{ backgroundColor: theme.panelBg }}>
      {/* Section header */}
      <div className="content-container pt-14 pb-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1" style={{ background: theme.indicatorInactive }} />
          <p className="text-[10px] tracking-[0.22em] uppercase font-sans shrink-0"
            style={{ color: theme.eyebrowColor }}>
            Популярное
          </p>
          <div className="h-px flex-1" style={{ background: theme.indicatorInactive }} />
        </div>
        <h2
          className="font-display font-black mt-4 leading-tight"
          style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", color: theme.headlineColor, letterSpacing: "-0.02em" }}
        >
          Товары
          <span className="ml-3" style={{ color: theme.subtitleColor }}>—</span>
        </h2>
      </div>

      {/* Product grid — inherits its own card styling */}
      <div className="pb-14">
        {children}
      </div>
    </section>
  )
}
