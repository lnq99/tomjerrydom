import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  const [{ collections }, productCategories] = await Promise.all([
    listCollections({ fields: "id,handle,title" }),
    listCategories({ fields: "id,name,handle,parent_category_id", limit: 50 }),
  ])

  const topCategories = productCategories?.filter((c) => !c.parent_category_id) ?? []

  return (
    <footer className="w-full" style={{ backgroundColor: "#0e0d0c", borderTop: "1px solid rgba(237,233,224,0.08)" }}>
      <div className="content-container py-14">
        <div className="flex flex-col xsmall:flex-row gap-12 xsmall:gap-16">

          {/* Brand column */}
          <div className="flex-1 min-w-0">
            <LocalizedClientLink
              href="/"
              className="font-display font-black text-xl tracking-tight leading-none hover:opacity-80 transition-opacity"
              style={{ color: "#EDE9E0" }}
            >
              Tom&amp;Jerry Дом
            </LocalizedClientLink>
            <p className="mt-3 text-sm leading-relaxed max-w-[22ch]"
              style={{ color: "rgba(237,233,224,0.50)" }}>
              Вейп-продукция в Москве. Широкий ассортимент, честные цены.
            </p>
            <div className="mt-6 flex flex-col gap-1.5 text-xs" style={{ color: "rgba(237,233,224,0.45)" }}>
              <p>Тихорецкий бульвар, 1с31, Москва</p>
              <a href="tel:+79998322223" className="hover:opacity-80 transition-opacity w-fit">
                +7 999 832-22-23
              </a>
              <a href="tel:+79251522224" className="hover:opacity-80 transition-opacity w-fit">
                +7 925 152-22-24
              </a>
              <a href="https://t.me/babumorgann" target="_blank" rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity w-fit mt-1">
                Telegram: @babumorgann
              </a>
            </div>
          </div>

          {/* Links columns */}
          <div className="flex gap-10 md:gap-16 shrink-0">
            {/* Navigation */}
            <div className="flex flex-col gap-3">
              <p className="text-[10px] tracking-[0.18em] uppercase font-sans font-medium"
                style={{ color: "rgba(237,233,224,0.35)" }}>
                Навигация
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: "Главная", href: "/" },
                  { label: "Магазин", href: "/store" },
                  { label: "О магазине", href: "/#about" },
                  { label: "Аккаунт", href: "/account" },
                ].map(({ label, href }) => (
                  <li key={href}>
                    <LocalizedClientLink
                      href={href}
                      className="text-sm hover:opacity-100 transition-opacity"
                      style={{ color: "rgba(237,233,224,0.55)" }}
                    >
                      {label}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            {topCategories.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] tracking-[0.18em] uppercase font-sans font-medium"
                  style={{ color: "rgba(237,233,224,0.35)" }}>
                  Категории
                </p>
                <ul className="flex flex-col gap-2.5" data-testid="footer-categories">
                  {topCategories.slice(0, 8).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        href={`/categories/${c.handle}`}
                        className="text-sm hover:opacity-100 transition-opacity"
                        style={{ color: "rgba(237,233,224,0.55)" }}
                        data-testid="category-link"
                      >
                        {c.name}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Collections */}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] tracking-[0.18em] uppercase font-sans font-medium"
                  style={{ color: "rgba(237,233,224,0.35)" }}>
                  Коллекции
                </p>
                <ul className="flex flex-col gap-2.5">
                  {collections.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        href={`/collections/${c.handle}`}
                        className="text-sm hover:opacity-100 transition-opacity"
                        style={{ color: "rgba(237,233,224,0.55)" }}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 flex flex-col xsmall:flex-row items-start xsmall:items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(237,233,224,0.08)" }}
        >
          <p className="text-xs" style={{ color: "rgba(237,233,224,0.30)" }}>
            © {new Date().getFullYear()} Tom&amp;Jerry Дом. Все права защищены.
          </p>
          <p className="text-xs" style={{ color: "rgba(237,233,224,0.20)" }}>
            Москва · Тихорецкий бульвар, 1с31
          </p>
        </div>
      </div>
    </footer>
  )
}
