"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLandingTheme } from "@lib/landing-theme"

const SAMPLE_BASE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample"

const FALLBACK_REELS = [
  { id: "1", src: `${SAMPLE_BASE}/ForBiggerBlazes.mp4` },
  { id: "2", src: `${SAMPLE_BASE}/ForBiggerEscapes.mp4` },
  { id: "3", src: `${SAMPLE_BASE}/ForBiggerJoyrides.mp4` },
]

export default function Reels() {
  const { theme, reelItems } = useLandingTheme()
  const reels = reelItems.length > 0 ? reelItems : FALLBACK_REELS
  const [active, setActive] = useState(0)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === active) {
        v.currentTime = 0
        v.play().catch(() => {})
      } else {
        v.pause()
      }
    })
    cardRefs.current[active]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [active])

  const handleEnded = useCallback(() => {
    setActive((prev) => (prev + 1) % reels.length)
  }, [])

  return (
    <section style={{ backgroundColor: theme.panelBg, borderTop: `1px solid ${theme.indicatorInactive}30` }}>
      <div className="content-container pt-12 pb-6">
        <div className="flex items-center gap-4 mb-8">
          <h2
            className="font-display font-black leading-tight shrink-0"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", color: theme.headlineColor, letterSpacing: "-0.02em" }}
          >
            Смотрите нас
          </h2>
          <div className="h-px flex-1" style={{ background: theme.indicatorInactive }} />
          <span className="text-[10px] tracking-[0.18em] uppercase font-sans shrink-0"
            style={{ color: theme.eyebrowColor }}>
            {active + 1} / {reels.length}
          </span>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 small:px-8 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {reels.map((reel, i) => (
          <div key={reel.id} ref={(el) => { cardRefs.current[i] = el }} className="shrink-0" style={{ width: "168px" }}>
            <button
              type="button"
              onClick={() => setActive(i)}
              className="relative w-full rounded-2xl overflow-hidden transition-all duration-300 block"
              style={{
                aspectRatio: "9/16",
                outline: i === active ? `2px solid ${theme.indicatorActive}` : "none",
                outlineOffset: "2px",
                opacity: i === active ? 1 : 0.45,
                transform: i === active ? "scale(1)" : "scale(0.95)",
              }}
              aria-label={`Рилс ${i + 1}`}
            >
              <video
                ref={(el) => { videoRefs.current[i] = el }}
                src={reel.src}
                muted
                playsInline
                preload="metadata"
                onEnded={i === active ? handleEnded : undefined}
                className="w-full h-full object-cover"
                style={{ backgroundColor: theme.cardBg }}
              />

              {i !== active && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
                    <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4 ml-0.5">
                      <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
                    </svg>
                  </div>
                </div>
              )}

              {i === active && (
                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `${theme.indicatorActive}40` }}>
                  <div className="h-full animate-[progress_15s_linear_forwards]"
                    style={{ background: theme.indicatorActive }} />
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-5 pb-12">
        {reels.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Рилс ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === active ? "16px" : "6px",
              height: "6px",
              background: i === active ? theme.indicatorActive : theme.indicatorInactive,
            }}
          />
        ))}
      </div>
    </section>
  )
}
