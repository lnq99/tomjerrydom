import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Unbounded } from "next/font/google"
import "styles/globals.css"

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "900"],
  variable: "--font-unbounded",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-mode="light" className={unbounded.variable}>
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
