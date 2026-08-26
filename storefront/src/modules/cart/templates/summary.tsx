"use client"

import { Button, Heading } from "@modules/common/components/ui"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import TierSwitcher from "@modules/tiers/components/tier-switcher"
import { HttpTypes } from "@medusajs/types"
import { type Tier, type TierTotal } from "@lib/data/tiers"

type SummaryProps = {
  cart: HttpTypes.StoreCart
  tiers?: Tier[]
  tierTotals?: TierTotal[]
  currentTierId?: string
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart, tiers = [], tierTotals = [], currentTierId = "retail" }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  const currentTier = tiers.find((t) => t.id === currentTierId) ?? tiers[0]
  const cartItemSubtotal = cart.item_subtotal ?? 0
  const meetsMinimum =
    !currentTier ||
    currentTier.min_order_amount === 0 ||
    cartItemSubtotal >= currentTier.min_order_amount

  return (
    <div className="flex flex-col gap-y-4">
      <Heading level="h2" className="text-[2rem] leading-[2.75rem]">
        Summary
      </Heading>

      {tiers.length > 1 && (
        <TierSwitcher
          tiers={tiers}
          tierTotals={tierTotals}
          currentTierId={currentTierId}
        />
      )}

      <DiscountCode cart={cart} />
      <Divider />
      <CartTotals totals={cart} />
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
      >
        <Button className="w-full h-10" disabled={!meetsMinimum}>
          {meetsMinimum
            ? "Go to checkout"
            : `Минимум ${new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format((currentTier?.min_order_amount ?? 0) / 100)}`}
        </Button>
      </LocalizedClientLink>
    </div>
  )
}

export default Summary
