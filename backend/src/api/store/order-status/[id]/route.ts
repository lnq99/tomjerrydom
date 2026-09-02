import { createHmac, timingSafeEqual } from "crypto"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const SECRET = process.env.ORDER_SHARE_SECRET ?? "dev-secret-change-in-prod"

function verifySignature(orderId: string, sig: string): boolean {
  if (!sig) return false
  const expected = createHmac("sha256", SECRET).update(orderId).digest("hex").slice(0, 24)
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const sig = req.query.sig as string | undefined

  if (!verifySignature(id, sig ?? "")) {
    return res.status(401).json({ message: "Invalid or missing signature" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderModule = req.scope.resolve(Modules.ORDER)

  const [order, { data: graphData }] = await Promise.all([
    orderModule.retrieveOrder(id, { relations: ["items"] }),
    query.graph({
      entity: "order",
      fields: [
        "id",
        "payment_collections.payments.id",
        "payment_collections.payments.captured_at",
        "payment_collections.status",
        "shipping_methods.id",
        "shipping_methods.name",
        "shipping_methods.amount",
      ],
      filters: { id },
    }) as Promise<{
      data: {
        id: string
        payment_collections?: {
          status: string
          payments?: { id: string; captured_at?: string | null }[]
        }[]
        shipping_methods?: { id: string; name: string; amount: number }[]
      }[]
    }>,
  ])

  if (!order) return res.status(404).json({ message: "Order not found" })

  const graphOrder = graphData?.[0]

  // Derive payment_status from captured_at (same logic as manager)
  const collections = graphOrder?.payment_collections ?? []
  const hasCapturedPayment = collections.some(
    (pc) => pc.status === "captured" || pc.payments?.some((p) => p.captured_at != null)
  )
  const paymentStatus = (order.status as string) === "canceled"
    ? "not_paid"
    : hasCapturedPayment
    ? "captured"
    : collections.length > 0
    ? (collections[0].status ?? "not_paid")
    : "awaiting"

  const items = ((order as any).items ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle ?? null,
    thumbnail: item.thumbnail ?? null,
    quantity: item.quantity,
    unit_price: item.unit_price ?? 0,
  }))

  res.json({
    order: {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      payment_status: paymentStatus,
      fulfillment_status: (order as any).fulfillment_status ?? "not_fulfilled",
      currency_code: (order as any).currency_code ?? "rub",
      total: (order as any).total ?? 0,
      subtotal: (order as any).subtotal ?? 0,
      shipping_total: (order as any).shipping_total ?? 0,
      created_at: order.created_at,
      updated_at: (order as any).updated_at,
      items,
      shipping_methods: graphOrder?.shipping_methods ?? [],
    },
  })
}
