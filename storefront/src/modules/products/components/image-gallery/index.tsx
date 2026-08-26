"use client"

import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import Image from "next/image"
import { useRef, useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)

  if (!images.length) return null

  const prev = () =>
    setCurrent((c) => (c - 1 + images.length) % images.length)
  const next = () => setCurrent((c) => (c + 1) % images.length)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -40) next()
    else if (dx > 40) prev()
    touchStartX.current = null
  }

  return (
    <div
      className="flex flex-col small:mx-16 gap-y-4"
      role="region"
      aria-label="Product images"
    >
      {/* Main image */}
      <Container
        className="relative aspect-[29/34] w-full overflow-hidden bg-ui-bg-subtle"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {images.map(
          (image, index) =>
            !!image.url && (
              <Image
                key={image.id}
                src={image.url}
                priority={index === 0}
                alt={`Product image ${index + 1}`}
                fill
                sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
                style={{ objectFit: "cover" }}
                className={`absolute inset-0 rounded-rounded transition-opacity duration-300 ${
                  index === current ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              />
            )
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={current === 0}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow hover:bg-white transition-colors disabled:opacity-30 hidden small:flex"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M13 4L7 10L13 16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={next}
              disabled={current === images.length - 1}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow hover:bg-white transition-colors disabled:opacity-30 hidden small:flex"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M7 4L13 10L7 16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}
      </Container>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="flex justify-center gap-x-2" role="tablist">
          {images.map((_, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={index === current}
              aria-label={`Image ${index + 1}`}
              onClick={() => setCurrent(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === current
                  ? "bg-ui-fg-base"
                  : "bg-ui-fg-muted opacity-40 hover:opacity-70"
              }`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-x-2 overflow-x-auto pb-1 snap-x">
          {images.map(
            (image, index) =>
              !!image.url && (
                <button
                  key={image.id}
                  onClick={() => setCurrent(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={index === current}
                  className={`relative flex-shrink-0 w-16 h-16 overflow-hidden rounded-rounded border-2 transition-colors snap-start ${
                    index === current
                      ? "border-ui-fg-base"
                      : "border-ui-border-base hover:border-ui-fg-muted"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    sizes="64px"
                    loading="lazy"
                    style={{ objectFit: "cover" }}
                  />
                </button>
              )
          )}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
