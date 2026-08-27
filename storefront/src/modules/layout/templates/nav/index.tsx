import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { listTiers } from "@lib/data/tiers"
import { getTierId } from "@lib/data/cookies"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SearchBox from "@modules/layout/components/search-box"
import SideMenu from "@modules/layout/components/side-menu"
import NavTierDropdown from "@modules/tiers/components/nav-tier-dropdown"

function CartIcon({ count }: { count: number }) {
  return (
    <span className="relative flex items-center hover:text-ui-fg-base" aria-label={`Корзина, ${count} товар`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-ui-fg-base text-white text-[10px] font-semibold leading-none">
          {count}
        </span>
      )}
    </span>
  )
}

export default async function Nav() {
  const [regions, locales, currentLocale, tiers, currentTierId] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
    listTiers(),
    getTierId(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b duration-200 bg-white border-ui-border-base">
        <nav className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center gap-x-3">
            <div className="h-full">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>
            {tiers.length > 1 && (
              <div className="hidden small:block">
                <NavTierDropdown tiers={tiers} currentTierId={currentTierId} />
              </div>
            )}
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus hover:text-ui-fg-base uppercase"
              data-testid="nav-store-link"
            >
              Tom&amp;Jerry Дом
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-4 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center gap-x-4 h-full">
              <Suspense fallback={null}>
                <SearchBox className="w-40 medium:w-56" />
              </Suspense>
              <LocalizedClientLink
                className="hover:text-ui-fg-base whitespace-nowrap"
                href="/account"
                data-testid="nav-account-link"
              >
                Аккаунт
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink href="/cart" data-testid="nav-cart-link">
                  <CartIcon count={0} />
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
