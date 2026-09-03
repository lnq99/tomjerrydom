"use client"

import { t } from "@lib/i18n"
import { Heading, Text, clx } from "@modules/common/components/ui"
import PaymentButton from "../payment-button"
import TierGate from "@modules/tiers/components/tier-gate"
import { useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { type Tier, type TierTotal } from "@lib/data/tiers"

type ReviewProps = {
  cart: HttpTypes.StoreCart
  tiers?: Tier[]
  tierTotals?: TierTotal[]
  currentTierId?: string
}

const Review = ({
  cart,
  tiers = [],
  tierTotals = [],
  currentTierId = "retail",
}: ReviewProps) => {
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards &&
    ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])?.length > 0 &&
    cart?.total === 0
  )

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none": !isOpen,
            }
          )}
        >
          {t("checkout_review")}
        </Heading>
      </div>
      {isOpen && previousStepsCompleted && (
        <>
          <div className="flex items-start gap-x-1 w-full mb-6">
            <div className="w-full">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("checkout_review_legal")}
              </Text>
            </div>
          </div>

          {tiers.length > 1 ? (
            <TierGate
              cartItemSubtotal={cart.item_subtotal ?? 0}
              tiers={tiers}
              tierTotals={tierTotals}
              currentTierId={currentTierId}
            >
              <PaymentButton cart={cart} data-testid="submit-order-button" />
            </TierGate>
          ) : (
            <PaymentButton cart={cart} data-testid="submit-order-button" />
          )}
        </>
      )}
    </div>
  )
}

export default Review
