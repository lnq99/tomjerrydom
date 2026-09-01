import { createHmac, timingSafeEqual } from "crypto"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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

  const { data } = (await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "payment_status",
      "fulfillment_status",
      "currency_code",
      "total",
      "subtotal",
      "shipping_total",
      "created_at",
      "updated_at",
      "items.id",
      "items.title",
      "items.subtitle",
      "items.thumbnail",
      "items.quantity",
      "items.unit_price",
      "shipping_methods.id",
      "shipping_methods.name",
      "shipping_methods.amount",
    ],
    filters: { id },
  })) as { data: any[] }

  const order = data?.[0]
  if (!order) {
    return res.status(404).json({ message: "Order not found" })
  }

  res.json({ order })
}
