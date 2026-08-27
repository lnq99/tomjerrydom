"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useLandingTheme } from "@lib/landing-theme"
import { useMediaCarousel, slides } from "@lib/use-media-carousel"

export default function CinemaHero() {
  const { theme } = useLandingTheme()
  const { active, setActive, animKey, setAnimKey, videoRefs, advance } = useMediaCarousel()

  const scrollToAbout = () =>
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })

  return (
    <section className="relative w-full min-h-[100svh] overflow-hidden bg-black">
      {/* Media carousel */}
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

      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ background: theme.overlay }} />
      <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{ background: theme.overlayBottom }} />

      {/* Content */}
      <div className="relative z-10 min-h-[100svh] flex flex-col justify-center px-6 small:px-16 py-24">
        <div className="max-w-lg motion-safe:animate-[fade-up_0.7s_ease-out_forwards] opacity-0 [animation-delay:200ms]">
          <p className="text-sm tracking-wide mb-4 font-sans transition-colors duration-500"
            style={{ color: theme.eyebrowColor }}>
            🐱 Tom&amp;Jerry Дом
          </p>
          <h1
            className="font-display font-black leading-[1.05] tracking-tight mb-5 transition-colors duration-500"
            style={{ fontSize: "clamp(2.4rem, 6vw, 4.2rem)", textWrap: "balance", color: theme.headlineColor }}
          >
            Вейп-продукция
            <br />
            <span style={{ color: theme.subtitleColor }}>в&nbsp;Москве</span>
          </h1>
          <p className="text-base leading-relaxed mb-8 max-w-sm font-sans"
            style={{ color: theme.bodyColor }}>
            Широкий ассортимент, честные цены, быстрая доставка. Самовывоз с&nbsp;Тихорецкого бульвара.
          </p>
          <div className="flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center gap-2 font-sans font-semibold text-sm px-6 py-3 rounded-xl transition-opacity duration-200 hover:opacity-85"
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
              className="inline-flex items-center gap-2 font-sans font-medium text-sm px-6 py-3 rounded-xl transition-opacity duration-200 hover:opacity-75 backdrop-blur-sm"
              style={{ border: `1px solid ${theme.ctaSecondary.border}`, color: theme.ctaSecondary.text }}
            >
              О магазине
            </button>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-7 left-6 small:left-16 z-10 flex gap-2">
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

      {/* Scroll hint */}
      <div className="absolute bottom-7 right-6 small:right-20 z-10 flex flex-col items-center gap-1.5 opacity-50">
        <div className="w-px h-8 animate-pulse" style={{ background: theme.scrollHint }} />
        <span className="text-[10px] tracking-widest font-sans rotate-90 origin-center mt-1.5"
          style={{ color: theme.scrollHint }}>scroll</span>
      </div>
    </section>
  )
}
