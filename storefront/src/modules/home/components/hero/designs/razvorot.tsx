"use client"

// Полоса — full-opacity video (no overlay), opaque horizontal band across the middle.
// Mouse: video parallax + cursor glow visible above/below the band.

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useLandingTheme } from "@lib/landing-theme"
import { useMediaCarousel, slides } from "@lib/use-media-carousel"
import { useHeroMouse } from "@lib/use-hero-mouse"

export default function PolosHero() {
  const { theme } = useLandingTheme()
  const { active, setActive, animKey, setAnimKey, videoRefs, advance } = useMediaCarousel()
  const { onMouseMove, onMouseLeave, parallaxStyle, glowStyle } = useHeroMouse()

  const scrollToAbout = () =>
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })

  return (
    <section
      className="relative w-full min-h-[100svh] overflow-hidden bg-black"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Full-opacity video with parallax */}
      {slides.map((slide, i) => (
        <div key={i} aria-hidden={i !== active}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === active ? "opacity-100" : "opacity-0"}`}
        >
          {slide.type === "video" ? (
            <video
              ref={(el) => { videoRefs.current[i] = el }}
              src={slide.src} muted playsInline
              preload={i === 0 ? "auto" : "metadata"}
              onEnded={i === active ? advance : undefined}
              className="w-full h-full object-cover"
              style={parallaxStyle(0.8)}
            />
          ) : (
            <div key={`kb-${animKey}-${i}`}
              className="w-full h-full bg-cover bg-center motion-safe:animate-[ken-burns_7s_ease-in-out_forwards]"
              style={{ backgroundImage: `url(${slide.src})`, ...parallaxStyle(0.8) }}
            />
          )}
        </div>
      ))}

      {/* Cursor glow over the video */}
      <div className="absolute inset-0 z-[1] pointer-events-none transition-all duration-300"
        style={glowStyle(255, 255, 255, 0.05)} />

      {/* THE BAND — opaque horizontal strip */}
      <div
        className="absolute inset-x-0 z-10 flex items-stretch"
        style={{ top: "50%", transform: "translateY(-50%)", background: theme.panelBg }}
      >
        <div className="w-1 shrink-0" style={{ background: theme.indicatorActive }} />

        <div className="flex flex-col small:flex-row items-start small:items-center gap-6 small:gap-0 w-full px-8 small:px-14 py-10 small:py-8">
          <div className="flex-1">
            <p className="text-[10px] tracking-[0.20em] uppercase mb-2.5 font-sans"
              style={{ color: theme.eyebrowColor }}>
              Tom&amp;Jerry Дом · Москва
            </p>
            <h1
              className="font-display font-black leading-[0.96] tracking-tight"
              style={{ fontSize: "clamp(1.9rem, 4.5vw, 3.8rem)", color: theme.headlineColor, letterSpacing: "-0.02em" }}
            >
              Вейп-продукция{" "}
              <span style={{ color: theme.subtitleColor }}>в Москве</span>
            </h1>
          </div>

          <div className="flex flex-col items-start small:items-end gap-4 small:pl-12 shrink-0 small:max-w-xs">
            <p className="text-xs leading-relaxed font-sans text-left small:text-right"
              style={{ color: theme.bodyColor }}>
              Широкий ассортимент, честные цены, быстрая доставка.
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-1.5 font-sans font-bold text-xs px-5 py-2.5 rounded-none transition-opacity hover:opacity-80"
                style={{ backgroundColor: theme.ctaPrimary.bg, color: theme.ctaPrimary.text }}
              >
                В каталог
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </LocalizedClientLink>
              <button type="button" onClick={scrollToAbout}
                className="inline-flex items-center gap-1.5 font-sans font-medium text-xs px-5 py-2.5 rounded-none transition-opacity hover:opacity-65"
                style={{ border: `1px solid ${theme.ctaSecondary.border}`, color: theme.ctaSecondary.text }}
              >
                О магазине
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: counter + indicators */}
      <div className="absolute bottom-6 right-6 small:right-14 z-10 flex items-center gap-4">
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button key={i} type="button"
              onClick={() => { setActive(i); setAnimKey((k) => k + 1) }}
              aria-label={`Слайд ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{ width: i === active ? "18px" : "5px", height: "5px", background: i === active ? theme.indicatorActive : theme.indicatorInactive }}
            />
          ))}
        </div>
        <span className="text-[10px] font-sans tabular-nums" style={{ color: theme.indicatorInactive }}>
          {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  )
}
