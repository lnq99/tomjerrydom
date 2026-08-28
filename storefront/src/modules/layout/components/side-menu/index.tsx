"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Fragment } from "react"
import { Locale } from "@lib/data/locales"

const SideMenuItems = {
  "Главная": "/",
  "Магазин": "/store",
  "Аккаунт": "/account",
  "Корзина": "/cart",
}

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  categories?: HttpTypes.StoreProductCategory[]
}

const SideMenu = ({ categories = [] }: SideMenuProps) => {
  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  className="relative h-full flex items-center transition-all ease-out duration-200 focus:outline-none hover:text-ui-fg-base"
                >
                  Меню
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-black/0 pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-2xl"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 backdrop-blur-2xl"
                leaveTo="opacity-0"
              >
                <PopoverPanel className="flex flex-col fixed inset-2 sm:right-auto sm:w-1/3 2xl:w-1/4 sm:min-w-min z-[51] text-sm text-ui-fg-on-color backdrop-blur-2xl">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full bg-[rgba(3,7,18,0.5)] rounded-rounded p-6"
                  >
                    <div className="flex justify-end mb-4" id="xmark">
                      <button data-testid="close-menu-button" onClick={close}>
                        <XMark />
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <ul className="flex flex-col gap-6 items-start pb-6">
                        {Object.entries(SideMenuItems).map(([name, href]) => (
                          <li key={name}>
                            <LocalizedClientLink
                              href={href}
                              className="text-3xl leading-10 hover:text-ui-fg-disabled"
                              onClick={close}
                              data-testid={`${name.toLowerCase()}-link`}
                            >
                              {name}
                            </LocalizedClientLink>
                          </li>
                        ))}
                        {categories.length > 0 && (
                          <li className="w-full">
                            <div className="border-t border-white/10 pt-6">
                              <p className="text-xs uppercase tracking-widest text-white/40 mb-4">Категории</p>
                              <ul className="flex flex-col gap-4">
                                {categories.map((cat) => (
                                  <li key={cat.id}>
                                    <LocalizedClientLink
                                      href={`/categories/${cat.handle}`}
                                      className="text-xl leading-8 hover:text-ui-fg-disabled"
                                      onClick={close}
                                    >
                                      {cat.name}
                                    </LocalizedClientLink>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
