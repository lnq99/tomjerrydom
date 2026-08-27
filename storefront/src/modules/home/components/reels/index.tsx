"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const BASE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample"

const REELS = [
  { id: 1, src: `${BASE}/ForBiggerBlazes.mp4` },
  { id: 2, src: `${BASE}/ForBiggerEscapes.mp4` },
  { id: 3, src: `${BASE}/ForBiggerJoyrides.mp4` },
  { id: 4, src: `${BASE}/ForBiggerMeltdowns.mp4` },
  { id: 5, src: `${BASE}/ForBiggerBlazes.mp4` },
]

export default function Reels() {
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

    cardRefs.current[active]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }, [active])

  const handleEnded = useCallback(() => {
    setActive((prev) => (prev + 1) % REELS.length)
  }, [])

  return (
    <section className="py-12 border-t border-ui-border-base">
      <div className="content-container mb-5">
        <h2 className="text-2xl font-semibold text-ui-fg-base">Смотрите нас</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 small:px-8 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {REELS.map((reel, i) => (
          <div
            key={reel.id}
            ref={(el) => { cardRefs.current[i] = el }}
            className="shrink-0"
            style={{ width: "168px" }}
          >
            <button
              type="button"
              onClick={() => setActive(i)}
              className={`relative w-full rounded-2xl overflow-hidden transition-all duration-300 block ${
                i === active
                  ? "ring-2 ring-ui-fg-interactive scale-100 opacity-100"
                  : "opacity-50 hover:opacity-75 scale-95 hover:scale-[0.97]"
              }`}
              style={{ aspectRatio: "9/16" }}
              aria-label={`Рилс ${i + 1}`}
            >
              <video
                ref={(el) => { videoRefs.current[i] = el }}
                src={reel.src}
                muted
                playsInline
                preload="metadata"
                onEnded={i === active ? handleEnded : undefined}
                className="w-full h-full object-cover bg-ui-bg-subtle"
              />

              {i !== active && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4 ml-0.5">
                      <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
                    </svg>
                  </div>
                </div>
              )}

              {i === active && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div className="h-full bg-white animate-[progress_15s_linear_forwards]" />
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4">
        {REELS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Рилс ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? "w-4 h-1.5 bg-ui-fg-base"
                : "w-1.5 h-1.5 bg-ui-border-strong hover:bg-ui-fg-muted"
            }`}
          />
        ))}
      </div>
    </section>
  )
}
