import { createHmac } from "crypto"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const SECRET = process.env.ORDER_SHARE_SECRET ?? "dev-secret-change-in-prod"
const STOREFRONT_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tomjerry.ru/ru"

function signOrderId(orderId: string): string {
  return createHmac("sha256", SECRET).update(orderId).digest("hex").slice(0, 24)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const sig = signOrderId(id)
  const url = `${STOREFRONT_URL}/order/${id}/status?sig=${sig}`
  res.json({ url })
}
