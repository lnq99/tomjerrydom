import { retrieveCart } from "@lib/data/cart"
import { applyTier } from "@lib/data/tiers"
import { getTierId } from "@lib/data/cookies"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Оформление заказа | Tom&Jerry Дом",
}

export default async function Checkout(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  let cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  if (!cart.items?.length) {
    redirect(`/${countryCode}/cart`)
  }

  const tierId = await getTierId()
  await applyTier(cart.id, tierId)
  cart = (await retrieveCart()) ?? cart

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <div>
        <h1 className="text-2xl font-semibold mb-8">Оформление заказа</h1>
        <CheckoutForm />
      </div>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
