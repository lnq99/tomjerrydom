import { listCollections } from "@lib/data/collections"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  const { collections } = await listCollections({ fields: "id,handle,title" })

  return (
    <footer className="w-full" style={{ backgroundColor: "#0e0d0c", borderTop: "1px solid rgba(237,233,224,0.08)" }}>
      <div className="content-container py-8">
        <div className="flex flex-col xsmall:flex-row gap-8 xsmall:items-start justify-between">

          {/* Brand + contact */}
          <div className="min-w-0">
            <LocalizedClientLink
              href="/"
              className="font-display font-black text-lg tracking-tight leading-none hover:opacity-80 transition-opacity"
              style={{ color: "#EDE9E0" }}
            >
              Tom&amp;Jerry Дом
            </LocalizedClientLink>
            <a
              href="https://yandex.ru/maps/?pt=37.778890,55.706350&z=16&l=map"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sm hover:opacity-70 transition-opacity w-fit block"
              style={{ color: "rgba(237,233,224,0.45)" }}
            >
              Вейп-продукция · Москва, Тихорецкий бульвар, 1с31
            </a>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "rgba(237,233,224,0.40)" }}>
              <a href="tel:+79998322223" className="hover:opacity-80 transition-opacity">+7 999 832-22-23</a>
              <a href="tel:+79251522224" className="hover:opacity-80 transition-opacity">+7 925 152-22-24</a>
              <a href="https://t.me/babumorgann" target="_blank" rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity">
                Telegram: @babumorgann
              </a>
            </div>
          </div>

          {/* Collections — only if data exists */}
          {collections && collections.length > 0 && (
            <div className="shrink-0 flex flex-col gap-2">
              <p className="text-[10px] tracking-[0.18em] uppercase font-sans font-medium"
                style={{ color: "rgba(237,233,224,0.30)" }}>
                Коллекции
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                {collections.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <LocalizedClientLink
                      href={`/collections/${c.handle}`}
                      className="text-sm hover:opacity-100 transition-opacity"
                      style={{ color: "rgba(237,233,224,0.50)" }}
                    >
                      {c.title}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs" style={{ color: "rgba(237,233,224,0.25)" }}>
          © {new Date().getFullYear()} Tom&amp;Jerry Дом. Все права защищены.
        </p>
      </div>
    </footer>
  )
}
