import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  createOrderPaymentCollectionWorkflow,
  markPaymentCollectionAsPaid,
} from "@medusajs/medusa/core-flows"

type PosItem = {
  variantId?: string
  title: string
  variantTitle?: string
  quantity: number
  unitPrice: number
  thumbnail?: string | null
}

type CreatePosOrderBody = {
  items: PosItem[]
  total: number
  tierId?: string
  mode?: "sell" | "order"
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { items, total, tierId, mode = "sell" } = req.body as CreatePosOrderBody

  if (!items?.length) {
    return res.status(400).json({ message: "Корзина пустая" })
  }

  const orderModule = req.scope.resolve(Modules.ORDER)

  const order = await orderModule.createOrders({
    currency_code: "rub",
    status: mode === "sell" ? "completed" : "pending",
    metadata: { source: "pos", tier_id: tierId ?? "retail", mode },
  })

  const totalRubles = Math.round(total / 100)

  await orderModule.createOrderLineItems(
    order.id,
    items.map((item) => ({
      title: item.variantTitle
        ? `${item.title} — ${item.variantTitle}`
        : item.title,
      variant_id: item.variantId,
      quantity: item.quantity,
      unit_price: Math.round(item.unitPrice / 100), // frontend sends kopecks; Medusa stores as-is in rubles
      thumbnail: item.thumbnail ?? undefined,
    }))
  )

  // For cash sales, create a payment collection and mark it as paid immediately
  if (mode === "sell") {
    try {
      const { result: paymentCollections } = await createOrderPaymentCollectionWorkflow(req.scope)
        .run({ input: { order_id: order.id, amount: totalRubles } })

      await markPaymentCollectionAsPaid(req.scope)
        .run({ input: { order_id: order.id, payment_collection_id: paymentCollections[0].id } })
    } catch {
      // Non-fatal: order is created even if payment collection fails
    }
  }

  res.json({
    order: {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      total,
      created_at: order.created_at,
    },
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.query as { id: string }
  if (!id) return res.status(400).json({ message: "Missing order id" })

  const orderModule = req.scope.resolve(Modules.ORDER)
  await orderModule.cancel(id)

  res.json({ success: true })
}
