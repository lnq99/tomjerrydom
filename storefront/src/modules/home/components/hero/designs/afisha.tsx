"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useLandingTheme } from "@lib/landing-theme"
import { useMediaCarousel, slides } from "@lib/use-media-carousel"

export default function AfishaHero() {
  const { theme } = useLandingTheme()
  const { active, setActive, animKey, setAnimKey, videoRefs, advance } = useMediaCarousel()

  const scrollToAbout = () =>
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })

  return (
    <section className="relative w-full min-h-[100svh] overflow-hidden bg-black flex flex-col items-center justify-center">
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

      {/* Radial vignette — heaviest at center where text sits */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: theme.overlay }} />
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
        style={{ background: theme.overlayBottom }} />
      {/* Top fade */}
      <div className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: theme.overlayBottom.replace("to top", "to bottom") }} />

      {/* Content — centered, poster-style */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 py-24 motion-safe:animate-[fade-up_0.8s_ease-out_forwards] opacity-0 [animation-delay:100ms]">
        {/* Thin horizontal rule eyebrow */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px w-12" style={{ background: theme.indicatorActive }} />
          <p className="text-xs tracking-[0.22em] uppercase font-sans"
            style={{ color: theme.eyebrowColor }}>
            Tom&amp;Jerry Дом · Москва
          </p>
          <div className="h-px w-12" style={{ background: theme.indicatorActive }} />
        </div>

        {/* Massive headline */}
        <h1
          className="font-display font-black leading-[0.92] tracking-tight mb-8 uppercase"
          style={{
            fontSize: "clamp(3.8rem, 11vw, 9.5rem)",
            textWrap: "balance",
            color: theme.headlineColor,
            letterSpacing: "-0.02em",
          }}
        >
          Вейп
          <br />
          <span style={{ color: theme.subtitleColor }}>Продукция</span>
          <br />
          <span className="text-[0.65em]" style={{ color: theme.headlineColor }}>в Москве</span>
        </h1>

        {/* Single primary CTA — poster style: one action */}
        <div className="flex flex-col xsmall:flex-row items-center gap-4">
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center gap-2.5 font-sans font-bold text-sm tracking-wide px-10 py-4 rounded-none border-2 transition-opacity duration-200 hover:opacity-80"
            style={{
              backgroundColor: theme.ctaPrimary.bg,
              color: theme.ctaPrimary.text,
              borderColor: theme.ctaPrimary.bg,
            }}
          >
            Открыть каталог
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
            </svg>
          </LocalizedClientLink>
          <button
            type="button"
            onClick={scrollToAbout}
            className="font-sans font-medium text-sm tracking-wide transition-opacity duration-200 hover:opacity-70 underline underline-offset-4"
            style={{ color: theme.ctaSecondary.text }}
          >
            О магазине
          </button>
        </div>
      </div>

      {/* Slide indicators — centered bottom */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex gap-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setActive(i); setAnimKey((k) => k + 1) }}
            aria-label={`Слайд ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === active ? "24px" : "6px",
              height: "6px",
              background: i === active ? theme.indicatorActive : theme.indicatorInactive,
            }}
          />
        ))}
      </div>
    </section>
  )
}
