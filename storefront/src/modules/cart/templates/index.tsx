import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"
import {
  applyTier,
  getCartTierTotals,
  listTiers,
  type Tier,
  type TierTotal,
} from "@lib/data/tiers"
import { getTierId } from "@lib/data/cookies"

const CartTemplate = async ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  let tiers: Tier[] = []
  let tierTotals: TierTotal[] = []
  let currentTierId = "retail"

  if (cart?.id) {
    ;[tiers, currentTierId] = await Promise.all([listTiers(), getTierId()])

    // Re-sync line item prices with the active tier on every cart load
    if (currentTierId !== "retail") {
      await applyTier(cart.id, currentTierId)
    }

    tierTotals = await getCartTierTotals(cart.id)
  }

  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-40">
            <div className="flex flex-col bg-white py-6 gap-y-6">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {cart && cart.region && (
                  <>
                    <div className="bg-white py-6">
                      <Summary
                        cart={cart}
                        tiers={tiers}
                        tierTotals={tierTotals}
                        currentTierId={currentTierId}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
