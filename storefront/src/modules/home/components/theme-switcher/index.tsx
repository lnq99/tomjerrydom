"use client"

import { useLandingTheme, themes } from "@lib/landing-theme"

export default function ThemeSwitcher() {
  const { theme, themeIndex, cycle } = useLandingTheme()

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Тема: ${theme.name}. Нажмите для следующей.`}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full px-4 py-2.5 text-xs font-sans font-semibold tracking-wide shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95"
      style={{
        background: "rgba(0,0,0,0.65)",
        border: `1px solid ${theme.indicatorActive}55`,
        color: theme.indicatorActive,
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${theme.indicatorActive}20`,
      }}
    >
      <span
        className="flex gap-1 items-center"
        aria-hidden="true"
      >
        {themes.map((t, i) => (
          <span
            key={t.key}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === themeIndex ? "20px" : "6px",
              height: "6px",
              background: i === themeIndex ? theme.indicatorActive : theme.indicatorInactive,
            }}
          />
        ))}
      </span>
      <span>{theme.name}</span>
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-70">
        <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
      </svg>
    </button>
  )
}
