"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type Slide = { type: "video"; src: string } | { type: "image"; src: string }

const SAMPLE_BASE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample"

export const DEFAULT_SLIDES: Slide[] = [
  { type: "video", src: `${SAMPLE_BASE}/ForBiggerBlazes.mp4` },
  { type: "image", src: "https://picsum.photos/seed/vape1/1920/1080" },
  { type: "video", src: `${SAMPLE_BASE}/ForBiggerJoyrides.mp4` },
  { type: "image", src: "https://picsum.photos/seed/vape2/1920/1080" },
]

const IMAGE_DURATION = 5000

export function useMediaCarousel(slides: Slide[] = DEFAULT_SLIDES) {
  const effectiveSlides = slides.length > 0 ? slides : DEFAULT_SLIDES
  const [active, setActive] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % effectiveSlides.length)
    setAnimKey((k) => k + 1)
  }, [effectiveSlides.length])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const slide = effectiveSlides[active]
    if (!slide) return
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
  }, [active, advance, effectiveSlides])

  return { slides: effectiveSlides, active, setActive, animKey, setAnimKey, videoRefs, advance }
}
