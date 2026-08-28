"use client"

import { useLandingTheme } from "@lib/landing-theme"

export default function AboutStore() {
  const { theme } = useLandingTheme()

  return (
    <section
      id="about"
      style={{ backgroundColor: theme.panelBg, borderTop: `1px solid ${theme.indicatorInactive}30` }}
    >
      <div className="content-container py-14">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-10">
          <h2
            className="font-display font-black leading-tight shrink-0"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)", color: theme.headlineColor, letterSpacing: "-0.02em" }}
          >
            О магазине
          </h2>
          <div className="h-px flex-1" style={{ background: theme.indicatorInactive }} />
        </div>

        <div className="flex flex-col small:flex-row gap-6">
          {/* Info card */}
          <div
            className="flex-1 rounded-2xl p-7 flex flex-col gap-6"
            style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
          >
            {/* Brand */}
            <div>
              <p className="text-lg font-bold mb-2" style={{ color: theme.headlineColor }}>
                🐱 Tom&amp;Jerry Дом.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: theme.bodyColor }}>
                Вейп-продукция в Москве. Широкий ассортимент, честные цены, быстрая доставка.
              </p>
            </div>

            {/* Telegram */}
            <a
              href="https://t.me/babumorgann"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-sans font-semibold text-sm px-4 py-2.5 rounded-xl transition-opacity hover:opacity-85 w-fit"
              style={{ backgroundColor: "#2AABEE", color: "#fff" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              @babumorgann
            </a>

            {/* Address + phone */}
            <div className="flex flex-col gap-5 text-sm">
              <div className="flex gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: theme.subtitleColor }} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <div>
                  <p className="uppercase text-[10px] tracking-wider font-medium mb-1"
                    style={{ color: theme.eyebrowColor }}>Адрес</p>
                  <p style={{ color: theme.headlineColor }}>Тихорецкий бульвар, 1с31, Москва, 109559</p>
                  <p className="mt-0.5 text-xs" style={{ color: theme.bodyColor }}>
                    1ст2/1 — 1ст2/2, линия К, здание Технолайн, рядом с банкоматом Т-Банк
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: theme.subtitleColor }} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <div>
                  <p className="uppercase text-[10px] tracking-wider font-medium mb-1"
                    style={{ color: theme.eyebrowColor }}>Телефон</p>
                  <p style={{ color: theme.headlineColor }}>
                    <a href="tel:+79998322223" className="transition-opacity hover:opacity-70">+79998322223</a>
                    {" / "}
                    <a href="tel:+79251522224" className="transition-opacity hover:opacity-70">+79251522224</a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 rounded-2xl overflow-hidden min-h-64 small:min-h-0"
            style={{ border: `1px solid ${theme.cardBorder}` }}>
            <iframe
              src="https://yandex.ru/map-widget/v1/?ll=37.778890%2C55.706350&z=16&pt=37.778890%2C55.706350%2Cpm2rdm&text=%D0%A2%D0%B8%D1%85%D0%BE%D1%80%D0%B5%D1%86%D0%BA%D0%B8%D0%B9%20%D0%B1%D1%83%D0%BB%D1%8C%D0%B2%D0%B0%D1%80%2C%201%D1%8131%2C%20%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0"
              width="100%"
              height="100%"
              style={{ minHeight: "280px", border: 0 }}
              allowFullScreen
              title="Карта магазина Tom&Jerry Дом"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
