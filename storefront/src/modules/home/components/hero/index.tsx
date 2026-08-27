"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Slide =
  | { type: "video"; src: string }
  | { type: "image"; src: string }

const BASE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample"

const slides: Slide[] = [
  { type: "video", src: `${BASE}/ForBiggerBlazes.mp4` },
  { type: "image", src: "https://picsum.photos/seed/vape1/1920/1080" },
  { type: "video", src: `${BASE}/ForBiggerJoyrides.mp4` },
  { type: "image", src: "https://picsum.photos/seed/vape2/1920/1080" },
]

const IMAGE_DURATION = 5000

export default function Hero() {
  const [active, setActive] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % slides.length)
    setAnimKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const slide = slides[active]

    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === active) {
        v.currentTime = 0
        v.play().catch(() => {})
      } else {
        v.pause()
      }
    })

    if (slide.type === "image") {
      timerRef.current = setTimeout(advance, IMAGE_DURATION)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [active, advance])

  const scrollToAbout = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })
  }

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
          style={{ willChange: "opacity" }}
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

      {/* Gradient overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.50) 45%, rgba(0,0,0,0.18) 100%)",
        }}
      />
      {/* Bottom fade for slide indicators */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full min-h-[100svh] flex flex-col justify-center px-6 small:px-16 py-24">
        <div className="max-w-lg motion-safe:animate-[fade-up_0.7s_ease-out_forwards] opacity-0 [animation-delay:200ms]">
          <p className="text-white/60 text-sm tracking-wide mb-4 font-sans">
            🐱 Tom&amp;Jerry Дом
          </p>

          <h1
            className="font-display font-black text-white leading-[1.05] tracking-tight mb-5"
            style={{
              fontSize: "clamp(2.2rem, 6vw, 4rem)",
              textWrap: "balance",
            }}
          >
            Вейп-продукция
            <br />
            <span className="text-white/70">в&nbsp;Москве</span>
          </h1>

          <p className="text-white/65 text-base leading-relaxed mb-8 max-w-sm font-sans">
            Широкий ассортимент, честные цены, быстрая доставка. Самовывоз с&nbsp;Тихорецкого бульвара.
          </p>

          <div className="flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center gap-2 bg-white text-black font-sans font-semibold text-sm px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
            >
              В каталог
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </LocalizedClientLink>

            <button
              type="button"
              onClick={scrollToAbout}
              className="inline-flex items-center gap-2 border border-white/40 text-white font-sans font-medium text-sm px-6 py-3 rounded-xl hover:bg-white/10 hover:border-white/70 transition-colors backdrop-blur-sm"
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
            className={`rounded-full transition-all duration-400 ${
              i === active
                ? "w-6 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-7 right-6 small:right-16 z-10 flex flex-col items-center gap-1 opacity-50">
        <div className="w-px h-8 bg-white/60 animate-pulse" />
        <span className="text-white text-[10px] tracking-widest font-sans rotate-90 origin-center mt-2">
          scroll
        </span>
      </div>
    </section>
  )
}
