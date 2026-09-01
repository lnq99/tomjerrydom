import { createHmac } from "crypto"

const SECRET = process.env.ORDER_SHARE_SECRET ?? "dev-secret-change-in-prod"

export function signOrderId(orderId: string): string {
  return createHmac("sha256", SECRET).update(orderId).digest("hex").slice(0, 24)
}
