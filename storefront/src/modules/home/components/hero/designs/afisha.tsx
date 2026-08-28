"use client"

// Обложка — editorial left column (~34%), backdrop-blur only (no solid bg).
// Video bleeds through. Heavy vertical rule. Large ghosted number behind headline.
// Mouse: video parallax + glow tinted with accent color.

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useLandingTheme } from "@lib/landing-theme"
import { useMediaCarousel } from "@lib/use-media-carousel"
import { useHeroMouse } from "@lib/use-hero-mouse"

export default function OblozhkaHero() {
  const { theme, heroSlides } = useLandingTheme()
  const { slides, active, setActive, animKey, setAnimKey, videoRefs, advance } = useMediaCarousel(heroSlides)
  const { onMouseMove, onMouseLeave, parallaxStyle, glowStyle } = useHeroMouse()

  const scrollToAbout = () =>
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })

  // Parse accent color for glow (approximate — teal 90,185,160)
  const accentRgb = theme.indicatorActive.startsWith("#")
    ? [
        parseInt(theme.indicatorActive.slice(1, 3), 16),
        parseInt(theme.indicatorActive.slice(3, 5), 16),
        parseInt(theme.indicatorActive.slice(5, 7), 16),
      ]
    : [255, 255, 255]

  return (
    <section
      className="relative w-full min-h-[100svh] overflow-hidden bg-black"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Full-bleed video with parallax */}
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
              style={parallaxStyle(0.7)}
            />
          ) : (
            <div key={`kb-${animKey}-${i}`}
              className="w-full h-full bg-cover bg-center motion-safe:animate-[ken-burns_7s_ease-in-out_forwards]"
              style={{ backgroundImage: `url(${slide.src})`, ...parallaxStyle(0.7) }}
            />
          )}
        </div>
      ))}

      {/* Accent-tinted cursor glow */}
      <div className="absolute inset-0 z-[1] pointer-events-none transition-all duration-300"
        style={glowStyle(accentRgb[0], accentRgb[1], accentRgb[2], 0.07)} />

      {/* Left editorial column — backdrop-blur only, no solid bg */}
      <div className="relative z-10 min-h-[100svh] flex">
        <div
          className="flex flex-col justify-between py-10 small:py-14 w-full small:w-[34%] px-6 small:px-10"
          style={{ backdropFilter: "blur(2px) brightness(0.55)", WebkitBackdropFilter: "blur(2px) brightness(0.55)" }}
        >
          {/* Top metadata */}
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans mb-1"
              style={{ color: theme.eyebrowColor }}>Tom&amp;Jerry Дом</p>
            <p className="text-[10px] tracking-[0.18em] font-sans"
              style={{ color: theme.indicatorInactive }}>Москва · 2026</p>
          </div>

          {/* Headline + copy + CTAs */}
          <div className="motion-safe:animate-[fade-up_0.6s_ease-out_forwards] opacity-0 [animation-delay:150ms]">
            <p className="font-display font-black leading-none mb-6 select-none"
              style={{ fontSize: "clamp(4rem, 10vw, 8rem)", color: theme.indicatorActive, opacity: 0.14, letterSpacing: "-0.04em" }}
              aria-hidden>01</p>

            <h1
              className="font-display font-black leading-[0.95] tracking-tight mb-6"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)", color: theme.headlineColor, letterSpacing: "-0.025em", textWrap: "balance" }}
            >
              Вейп-<br />продукция<br />
              <span style={{ color: theme.subtitleColor }}>в&nbsp;Москве</span>
            </h1>

            <p className="text-xs leading-relaxed mb-8 font-sans max-w-[24ch]"
              style={{ color: theme.bodyColor }}>
              Широкий ассортимент. Честные цены. Быстрая доставка.
            </p>

            <div className="flex flex-col gap-2.5">
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-2 font-sans font-bold text-xs px-6 py-3 transition-opacity hover:opacity-80"
                style={{ backgroundColor: theme.ctaPrimary.bg, color: theme.ctaPrimary.text }}
              >
                В каталог →
              </LocalizedClientLink>
              <button type="button" onClick={scrollToAbout}
                className="inline-flex items-center font-sans font-medium text-xs px-6 py-3 transition-opacity hover:opacity-65"
                style={{ border: `1px solid ${theme.ctaSecondary.border}`, color: theme.ctaSecondary.text }}
              >
                О магазине
              </button>
            </div>
          </div>

          {/* Bottom indicators */}
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button key={i} type="button"
                onClick={() => { setActive(i); setAnimKey((k) => k + 1) }}
                aria-label={`Слайд ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{ width: i === active ? "20px" : "5px", height: "5px", background: i === active ? theme.indicatorActive : theme.indicatorInactive }}
              />
            ))}
          </div>
        </div>

        {/* Vertical rule */}
        <div className="hidden small:block w-px shrink-0 self-stretch"
          style={{ background: `linear-gradient(to bottom, transparent, ${theme.indicatorActive}50, transparent)` }} />
      </div>
    </section>
  )
}
