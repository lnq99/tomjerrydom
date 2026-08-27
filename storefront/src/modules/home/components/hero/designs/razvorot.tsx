"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useLandingTheme } from "@lib/landing-theme"
import { useMediaCarousel, slides } from "@lib/use-media-carousel"

export default function RazvorotHero() {
  const { theme } = useLandingTheme()
  const { active, setActive, animKey, setAnimKey, videoRefs, advance } = useMediaCarousel()

  const scrollToAbout = () =>
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })

  return (
    <section className="relative w-full min-h-[100svh] flex flex-col small:flex-row overflow-hidden">
      {/* LEFT: content panel — solid, no media behind */}
      <div
        className="relative z-10 flex flex-col justify-center px-8 small:px-14 py-16 small:py-24 w-full small:w-1/2 min-h-[55svh] small:min-h-[100svh]"
        style={{ backgroundColor: theme.panelBg }}
      >
        {/* Subtle vertical line on the right edge (desktop only) */}
        <div
          className="absolute top-0 right-0 bottom-0 w-px hidden small:block"
          style={{ background: `linear-gradient(to bottom, transparent, ${theme.indicatorActive}30, transparent)` }}
        />

        <div className="motion-safe:animate-[fade-up_0.6s_ease-out_forwards] opacity-0 [animation-delay:150ms]">
          <p className="text-xs tracking-[0.18em] uppercase mb-6 font-sans"
            style={{ color: theme.eyebrowColor }}>
            🐱 Tom&amp;Jerry Дом
          </p>

          <h1
            className="font-display font-black leading-[0.98] tracking-tight mb-6"
            style={{ fontSize: "clamp(2.8rem, 5.5vw, 5rem)", textWrap: "balance", color: theme.headlineColor }}
          >
            Вейп-
            <br />
            продукция
            <br />
            <span style={{ color: theme.subtitleColor }}>в Москве</span>
          </h1>

          <div
            className="w-12 h-0.5 mb-6"
            style={{ background: theme.indicatorActive }}
          />

          <p className="text-sm leading-relaxed mb-10 max-w-xs font-sans"
            style={{ color: theme.bodyColor }}>
            Широкий ассортимент, честные цены, быстрая доставка. Самовывоз с&nbsp;Тихорецкого бульвара.
          </p>

          <div className="flex flex-col xsmall:flex-row gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-sm px-7 py-3.5 rounded-lg transition-opacity duration-200 hover:opacity-85"
              style={{ backgroundColor: theme.ctaPrimary.bg, color: theme.ctaPrimary.text }}
            >
              В каталог
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </LocalizedClientLink>
            <button
              type="button"
              onClick={scrollToAbout}
              className="inline-flex items-center justify-center gap-2 font-sans font-medium text-sm px-7 py-3.5 rounded-lg transition-opacity duration-200 hover:opacity-70"
              style={{ border: `1px solid ${theme.ctaSecondary.border}`, color: theme.ctaSecondary.text }}
            >
              О магазине
            </button>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-7 left-8 small:left-14 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setActive(i); setAnimKey((k) => k + 1) }}
              aria-label={`Слайд ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === active ? "22px" : "6px",
                height: "6px",
                background: i === active ? theme.indicatorActive : theme.indicatorInactive,
              }}
            />
          ))}
        </div>
      </div>

      {/* RIGHT: raw video — no gradient, no overlay, full bleed */}
      <div className="relative w-full small:w-1/2 h-[45svh] small:h-auto overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            aria-hidden={i !== active}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          >
            {slide.type === "video" ? (
              <video
                ref={(el) => { videoRefs.current[i] = el }}
                src={slide.src}
                muted
                playsInline
                preload={i === 0 ? "auto" : "metadata"}
                onEnded={i === active ? advance : undefined}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                key={`kb-${animKey}-${i}`}
                className="w-full h-full bg-cover bg-center motion-safe:animate-[ken-burns_7s_ease-in-out_forwards]"
                style={{ backgroundImage: `url(${slide.src})` }}
              />
            )}
          </div>
        ))}
        {/* Subtle edge fade so the seam doesn't look harsh on desktop */}
        <div
          className="absolute inset-y-0 left-0 w-8 pointer-events-none hidden small:block"
          style={{ background: `linear-gradient(to right, ${theme.panelBg}, transparent)` }}
        />
      </div>
    </section>
  )
}
