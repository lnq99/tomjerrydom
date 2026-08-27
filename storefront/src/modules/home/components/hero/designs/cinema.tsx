"use client"

// Диагональ — diagonal geometric split, constructivist energy.
// Video clipped to a parallelogram right side. Solid dark panel left.
// Mouse: video parallax + cursor glow on the video side.

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useLandingTheme } from "@lib/landing-theme"
import { useMediaCarousel, slides } from "@lib/use-media-carousel"
import { useHeroMouse } from "@lib/use-hero-mouse"

export default function DiagonalHero() {
  const { theme } = useLandingTheme()
  const { active, setActive, animKey, setAnimKey, videoRefs, advance } = useMediaCarousel()
  const { onMouseMove, onMouseLeave, parallaxStyle, glowStyle } = useHeroMouse()

  const scrollToAbout = () =>
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })

  return (
    <section
      className="relative w-full min-h-[100svh] overflow-hidden flex"
      style={{ backgroundColor: theme.panelBg }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* LEFT: solid dark panel */}
      <div className="relative z-10 flex flex-col justify-center px-8 small:px-14 py-24 w-full small:w-[52%] min-h-[100svh]">
        <div className="motion-safe:animate-[fade-up_0.55s_ease-out_forwards] opacity-0 [animation-delay:100ms]">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-0.5 w-10" style={{ background: theme.indicatorActive }} />
            <span className="text-[10px] tracking-[0.22em] uppercase font-sans"
              style={{ color: theme.eyebrowColor }}>
              Москва · Вейп
            </span>
          </div>

          <h1
            className="font-display font-black leading-[0.93] tracking-tight mb-8"
            style={{ fontSize: "clamp(3rem, 6.5vw, 5.5rem)", color: theme.headlineColor, letterSpacing: "-0.025em" }}
          >
            Вейп-<br />про-<br />дукция<br />
            <span style={{ color: theme.subtitleColor }}>в Москве</span>
          </h1>

          <p className="text-sm leading-relaxed mb-10 max-w-[26ch] font-sans"
            style={{ color: theme.bodyColor }}>
            Широкий ассортимент, честные цены, быстрая доставка.
          </p>

          <div className="flex flex-col xsmall:flex-row gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center gap-2 font-sans font-bold text-sm px-7 py-3.5 transition-opacity hover:opacity-80"
              style={{
                backgroundColor: theme.ctaPrimary.bg,
                color: theme.ctaPrimary.text,
                clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 100%, 8px 100%)",
              }}
            >
              В каталог
            </LocalizedClientLink>
            <button
              type="button"
              onClick={scrollToAbout}
              className="inline-flex items-center gap-2 font-sans font-medium text-sm px-7 py-3.5 transition-opacity hover:opacity-70"
              style={{
                border: `1px solid ${theme.ctaSecondary.border}`,
                color: theme.ctaSecondary.text,
                clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 100%, 8px 100%)",
              }}
            >
              О магазине
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-8 small:left-14 flex gap-2">
          {slides.map((_, i) => (
            <button key={i} type="button"
              onClick={() => { setActive(i); setAnimKey((k) => k + 1) }}
              aria-label={`Слайд ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{ width: i === active ? "20px" : "6px", height: "6px", background: i === active ? theme.indicatorActive : theme.indicatorInactive }}
            />
          ))}
        </div>
      </div>

      {/* RIGHT: video clipped into parallelogram with parallax */}
      <div
        className="absolute top-0 right-0 bottom-0 w-[60%] hidden small:block overflow-hidden"
        style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0% 100%)" }}
      >
        {/* Cursor glow — follows mouse within video panel */}
        <div className="absolute inset-0 z-10 transition-all duration-300"
          style={glowStyle(255, 255, 255, 0.05)} />

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
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(to right, ${theme.panelBg}55 0%, transparent 18%)` }} />
      </div>

      {/* Mobile: video strip at top */}
      <div className="absolute top-0 inset-x-0 h-[38svh] small:hidden overflow-hidden">
        {slides.map((slide, i) => (
          <div key={`m-${i}`} aria-hidden={i !== active}
            className={`absolute inset-0 transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
          >
            {slide.type === "video" ? (
              <video ref={(el) => { if (!videoRefs.current[i]) videoRefs.current[i] = el }}
                src={slide.src} muted playsInline preload="metadata"
                className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.src})` }} />
            )}
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: `linear-gradient(to top, ${theme.panelBg}, transparent)` }} />
      </div>
      <div className="block small:hidden h-[34svh] w-full shrink-0" aria-hidden />
    </section>
  )
}
