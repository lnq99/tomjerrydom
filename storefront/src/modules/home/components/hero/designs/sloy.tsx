"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useLandingTheme } from "@lib/landing-theme"
import { useMediaCarousel, slides } from "@lib/use-media-carousel"

export default function SloyHero() {
  const { theme } = useLandingTheme()
  const { active, setActive, animKey, setAnimKey, videoRefs, advance } = useMediaCarousel()

  const scrollToAbout = () =>
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })

  return (
    <section className="relative w-full min-h-[100svh] overflow-hidden bg-black">
      {/* Media carousel — minimal overlay so video shows clearly */}
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

      {/* Light diagonal overlay — video stays visible */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: theme.overlay }} />
      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{ background: theme.overlayBottom }} />

      {/* Glass content card */}
      <div className="relative z-10 min-h-[100svh] flex items-center px-6 small:px-16 py-24">
        <div
          className="w-full max-w-sm motion-safe:animate-[fade-up_0.65s_ease-out_forwards] opacity-0 [animation-delay:180ms] rounded-2xl p-8 small:p-10"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Card top accent line */}
          <div
            className="w-8 h-0.5 mb-6"
            style={{ background: theme.indicatorActive }}
          />

          <p className="text-xs tracking-[0.18em] uppercase mb-5 font-sans"
            style={{ color: theme.eyebrowColor }}>
            🐱 Tom&amp;Jerry Дом
          </p>

          <h1
            className="font-display font-black leading-[1.0] tracking-tight mb-5"
            style={{ fontSize: "clamp(2.2rem, 5.5vw, 3.6rem)", textWrap: "balance", color: theme.headlineColor }}
          >
            Вейп-продукция
            <br />
            <span style={{ color: theme.subtitleColor }}>в Москве</span>
          </h1>

          <p className="text-sm leading-relaxed mb-8 font-sans"
            style={{ color: theme.bodyColor }}>
            Широкий ассортимент, честные цены, быстрая доставка. Самовывоз с&nbsp;Тихорецкого бульвара.
          </p>

          <div className="flex flex-col gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-sm px-6 py-3.5 rounded-xl transition-opacity duration-200 hover:opacity-85 w-full"
              style={{ backgroundColor: theme.ctaPrimary.bg, color: theme.ctaPrimary.text }}
            >
              В каталог
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </LocalizedClientLink>
            <button
              type="button"
              onClick={scrollToAbout}
              className="inline-flex items-center justify-center gap-2 font-sans font-medium text-sm px-6 py-3.5 rounded-xl transition-opacity duration-200 hover:opacity-70 w-full"
              style={{ border: `1px solid ${theme.ctaSecondary.border}`, color: theme.ctaSecondary.text }}
            >
              О магазине
            </button>
          </div>

          {/* Indicators inside card bottom */}
          <div className="flex gap-2 mt-7 pt-6"
            style={{ borderTop: `1px solid ${theme.cardBorder}` }}>
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setActive(i); setAnimKey((k) => k + 1) }}
                aria-label={`Слайд ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === active ? "20px" : "6px",
                  height: "6px",
                  background: i === active ? theme.indicatorActive : theme.indicatorInactive,
                }}
              />
            ))}
            <span className="ml-auto text-[10px] font-sans tracking-wide"
              style={{ color: theme.eyebrowColor }}>
              {active + 1} / {slides.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
