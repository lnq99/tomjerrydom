import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Adds a RUB price to every variant that has no price set.
 * Price = product.metadata.cost (whole rubles). Falls back to 1 RUB so
 * Medusa allows add-to-cart even for products without cost data.
 *
 * Run once after catalog import:
 *   npx medusa exec ./src/migration-scripts/add-variant-prices.ts
 */
export default async function add_variant_prices({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricingModule = container.resolve(Modules.PRICING)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  logger.info("Fetching products and variants…")

  // Fetch all products with their variants and price set links
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "variants.id"],
  })

  // Find variant → price_set mapping (all variants have an auto-created empty price set)
  const { data: variantLinks } = await query.graph({
    entity: "product_variant",
    fields: ["id", "price_set.id"],
  })
  const priceSetByVariant = new Map<string, string>(
    variantLinks
      .filter((v: any) => v.price_set?.id)
      .map((v: any) => [v.id as string, v.price_set.id as string])
  )

  logger.info(`${priceSetByVariant.size} variants have a price set`)

  let created = 0
  let skipped = 0

  const BATCH = 100

  // Collect (priceSetId, amount) pairs — one RUB price per variant
  const todo: Array<{ priceSetId: string; amount: number }> = []

  for (const product of products) {
    const cost = (product.metadata as any)?.cost
    const amount = typeof cost === "number" && cost > 0 ? Math.round(cost) : 1

    for (const variant of (product as any).variants ?? []) {
      const priceSetId = priceSetByVariant.get(variant.id)
      if (!priceSetId) {
        skipped++
        continue
      }
      todo.push({ priceSetId, amount })
    }
  }

  logger.info(`Adding RUB prices to ${todo.length} price sets…`)

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)

    await pricingModule.addPrices(
      batch.map((item) => ({
        priceSetId: item.priceSetId,
        prices: [{ amount: item.amount, currency_code: "rub", rules: {} }],
      }))
    )

    created += batch.length

    if (i % (BATCH * 5) === 0 || i + BATCH >= todo.length) {
      logger.info(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}`)
    }
  }

  logger.info(`Done. Prices added: ${created}, Skipped (no price set): ${skipped}`)
}
