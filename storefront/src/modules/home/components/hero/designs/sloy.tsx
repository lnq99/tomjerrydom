"use client"

// Вывеска — giant outlined/hollow display type (WebkitTextStroke) over full video.
// Video visible through the letterforms.
// Bottom strip holds copy + CTAs.
// Mouse: video parallax + cursor glow. On hover, outline type shifts slightly (counter-parallax).

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useLandingTheme } from "@lib/landing-theme"
import { useMediaCarousel } from "@lib/use-media-carousel"
import { useHeroMouse } from "@lib/use-hero-mouse"

export default function Vyveska() {
  const { theme, heroSlides } = useLandingTheme()
  const { slides, active, setActive, animKey, setAnimKey, videoRefs, advance } = useMediaCarousel(heroSlides)
  const { pos, onMouseMove, onMouseLeave, parallaxStyle, glowStyle } = useHeroMouse()

  const scrollToAbout = () =>
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })

  // Text counter-parallax (moves WITH cursor, opposite of video)
  const textParallaxStyle: React.CSSProperties = {
    transform: `translate(${(pos.x - 0.5) * 12}px, ${(pos.y - 0.5) * 8}px)`,
    transition: "transform 1.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  }

  return (
    <section
      className="relative w-full min-h-[100svh] overflow-hidden bg-black flex flex-col"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Full video with parallax */}
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
              style={parallaxStyle()}
            />
          ) : (
            <div key={`kb-${animKey}-${i}`}
              className="w-full h-full bg-cover bg-center motion-safe:animate-[ken-burns_7s_ease-in-out_forwards]"
              style={{ backgroundImage: `url(${slide.src})`, ...parallaxStyle() }}
            />
          )}
        </div>
      ))}

      {/* Cursor glow */}
      <div className="absolute inset-0 z-[1] pointer-events-none transition-all duration-300"
        style={glowStyle(255, 255, 255, 0.06)} />

      {/* Hollow outlined type — counter-parallax to video */}
      <div
        className="relative z-10 flex-1 flex flex-col justify-center px-4 small:px-10 pt-20 pb-4"
        aria-label="Вейп-продукция в Москве"
      >
        <div
          className="font-display font-black leading-[0.88] select-none motion-safe:animate-[fade-up_0.7s_ease-out_forwards] opacity-0 [animation-delay:80ms]"
          aria-hidden
          style={{
            fontSize: "clamp(4.5rem, 13.5vw, 13rem)",
            letterSpacing: "-0.03em",
            WebkitTextStroke: `2px ${theme.headlineColor}`,
            color: "transparent",
            ...textParallaxStyle,
          }}
        >
          ВЕЙП
          <br />
          <span style={{ WebkitTextStroke: `2px ${theme.subtitleColor}` }}>
            ПРО-<br />ДУК-<br />ЦИЯ
          </span>
        </div>
      </div>

      {/* Bottom strip */}
      <div
        className="relative z-10 w-full px-6 small:px-14 py-6 small:py-5 flex flex-col small:flex-row items-start small:items-center gap-5 small:gap-10"
        style={{ backgroundColor: theme.panelBg }}
      >
        <div className="flex items-start gap-4 flex-1">
          <div className="w-0.5 h-10 shrink-0 mt-0.5" style={{ background: theme.indicatorActive }} />
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase font-sans mb-1"
              style={{ color: theme.eyebrowColor }}>
              Tom&amp;Jerry Дом · Москва
            </p>
            <p className="text-xs font-sans leading-snug" style={{ color: theme.bodyColor }}>
              Вейп-продукция — ассортимент, цены, доставка, самовывоз.
            </p>
          </div>
        </div>

        <div className="flex gap-2.5 shrink-0">
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center gap-1.5 font-sans font-bold text-xs px-6 py-2.5 transition-opacity hover:opacity-80"
            style={{ backgroundColor: theme.ctaPrimary.bg, color: theme.ctaPrimary.text }}
          >
            В каталог
          </LocalizedClientLink>
          <button type="button" onClick={scrollToAbout}
            className="inline-flex items-center font-sans font-medium text-xs px-6 py-2.5 transition-opacity hover:opacity-65"
            style={{ border: `1px solid ${theme.ctaSecondary.border}`, color: theme.ctaSecondary.text }}
          >
            О магазине
          </button>
        </div>

        <div className="flex gap-2 shrink-0">
          {slides.map((_, i) => (
            <button key={i} type="button"
              onClick={() => { setActive(i); setAnimKey((k) => k + 1) }}
              aria-label={`Слайд ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{ width: i === active ? "18px" : "5px", height: "5px", background: i === active ? theme.indicatorActive : theme.indicatorInactive }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
