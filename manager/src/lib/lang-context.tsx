"use client"

import { createContext, useContext, useState } from "react"
import { strings, type Lang, type StringKey } from "@/lib/i18n"

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: StringKey) => string
}

const LangContext = createContext<LangContextValue>({
  lang: "vi",
  setLang: () => {},
  t: (key) => strings.vi[key],
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("vi")

  function t(key: StringKey): string {
    return strings[lang][key]
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
