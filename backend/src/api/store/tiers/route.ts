import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TIERS } from "../../../data/tiersConfig"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({ tiers: TIERS })
}
