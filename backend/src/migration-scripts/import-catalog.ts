import * as fs from "fs"
import * as path from "path"
import * as https from "https"
import * as http from "http"
import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  linkProductsToSalesChannelWorkflow,
} from "@medusajs/medusa/core-flows"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CatalogCategory = {
  name: string
  subcategories: string[]
}

type CatalogProduct = {
  category: string
  subcategory: string | null
  title: string
  variants: string[]
  cost: number | null
  img_url: string | null
  img_name: string | null
}

type CatalogData = {
  categories: CatalogCategory[]
  products: CatalogProduct[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 255)
}

function ensureUniqueHandle(base: string, seen: Set<string>): string {
  let handle = base
  let n = 2
  while (seen.has(handle)) {
    handle = `${base}-${n++}`
  }
  seen.add(handle)
  return handle
}

async function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http
    const req = client.get(url, { timeout: 10_000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadBuffer(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const chunks: Buffer[] = []
      res.on("data", (c: Buffer) => chunks.push(c))
      res.on("end", () => resolve(Buffer.concat(chunks)))
      res.on("error", reject)
    })
    req.on("error", reject)
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")) })
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default async function import_catalog({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService = container.resolve(Modules.FILE)

  const catalogPath = path.resolve(__dirname, "../../../scripts/catalog-data.json")
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`catalog-data.json not found. Run: python3 scripts/preprocess-catalog.py`)
  }

  const catalog: CatalogData = JSON.parse(fs.readFileSync(catalogPath, "utf-8"))
  logger.info(`Loaded ${catalog.products.length} products, ${catalog.categories.length} categories`)

  // -------------------------------------------------------------------------
  // Load existing sales channel (required to link products)
  // -------------------------------------------------------------------------
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  if (!salesChannels.length) {
    throw new Error("No sales channel found. Run initial-data-seed first.")
  }
  const salesChannelId = salesChannels[0].id
  logger.info(`Using sales channel: ${salesChannels[0].name} (${salesChannelId})`)

  // -------------------------------------------------------------------------
  // Build category tree
  // -------------------------------------------------------------------------
  logger.info("Creating product categories...")

  // Fetch any already-existing categories to avoid duplicates
  const { data: existingCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "name"],
  })
  const existingHandles = new Map(existingCats.map((c: any) => [c.handle, c.id]))
  const catIdByHandle = new Map<string, string>(existingHandles)

  const seenHandles = new Set<string>(existingHandles.keys())

  // Create top-level categories
  const topLevelToCreate = catalog.categories.filter(
    (c) => !existingHandles.has(slugify(c.name))
  )

  if (topLevelToCreate.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: topLevelToCreate.map((c) => {
          const handle = ensureUniqueHandle(slugify(c.name), seenHandles)
          return { name: c.name, handle, is_active: true }
        }),
      },
    })
    for (const cat of result) {
      catIdByHandle.set(cat.handle, cat.id)
    }
    logger.info(`Created ${result.length} top-level categories`)
  }

  // Resolve top-level IDs (handle → id)
  const topHandleById = new Map<string, string>()
  for (const c of catalog.categories) {
    const h = slugify(c.name)
    const id = catIdByHandle.get(h)
    if (id) topHandleById.set(c.name, id)
  }

  // Create subcategories under their parent
  const subToCreate: Array<{ name: string; handle: string; parent_category_id: string }> = []

  for (const cat of catalog.categories) {
    const parentId = topHandleById.get(cat.name)
    if (!parentId) continue

    for (const subName of cat.subcategories) {
      const subHandle = slugify(`${cat.name}-${subName}`)
      if (!catIdByHandle.has(subHandle)) {
        subToCreate.push({ name: subName, handle: subHandle, parent_category_id: parentId })
      }
    }
  }

  // Create in batches of 50
  const SUB_BATCH = 50
  for (let i = 0; i < subToCreate.length; i += SUB_BATCH) {
    const batch = subToCreate.slice(i, i + SUB_BATCH)
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: batch.map((s) => ({ ...s, is_active: true })) },
    })
    for (const cat of result) {
      catIdByHandle.set(cat.handle, cat.id)
    }
  }
  logger.info(`Created ${subToCreate.length} subcategories`)

  // Build lookup: (category, subcategory) → category_id
  function resolveCategoryId(catName: string, subName: string | null): string | null {
    if (subName) {
      const h = slugify(`${catName}-${subName}`)
      return catIdByHandle.get(h) ?? null
    }
    return topHandleById.get(catName) ?? null
  }

  // -------------------------------------------------------------------------
  // Create products
  // -------------------------------------------------------------------------
  logger.info("Creating products...")

  // Check existing product titles to skip already-imported ones
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
  })
  const existingTitles = new Set(existingProducts.map((p: any) => p.title as string))
  logger.info(`${existingTitles.size} products already exist — will skip duplicates`)

  const productHandles = new Set<string>()
  const PRODUCT_BATCH = 25
  let created = 0
  let skipped = 0

  const toCreate = catalog.products.filter((p) => !existingTitles.has(p.title))

  for (let i = 0; i < toCreate.length; i += PRODUCT_BATCH) {
    const batch = toCreate.slice(i, i + PRODUCT_BATCH)

    const productsInput = batch.map((p) => {
      const categoryId = resolveCategoryId(p.category, p.subcategory)
      const handle = ensureUniqueHandle(slugify(p.title), productHandles)

      // Each flavor → one variant; if no variants, one default variant
      const variantTitles = p.variants.length > 0 ? p.variants : ["Standard"]
      const hasOptions = p.variants.length > 0

      return {
        title: p.title,
        handle,
        status: "published" as const,
        sales_channels: [{ id: salesChannelId }],
        categories: categoryId ? [{ id: categoryId }] : [],
        metadata: p.cost !== null ? { cost: p.cost } : {},
        ...(hasOptions
          ? {
              options: [{ title: "Вкус", values: variantTitles }],
              variants: variantTitles.map((v) => ({
                title: v,
                options: { Вкус: v },
                manage_inventory: false,
              })),
            }
          : {
              variants: [
                {
                  title: "Standard",
                  manage_inventory: false,
                },
              ],
            }),
      }
    })

    try {
      const { result } = await createProductsWorkflow(container).run({
        input: { products: productsInput },
      })
      created += result.length
    } catch (err: any) {
      logger.error(`Batch ${i}-${i + PRODUCT_BATCH} failed: ${err.message}`)
    }

    if ((i / PRODUCT_BATCH) % 10 === 0) {
      logger.info(`Progress: ${Math.min(i + PRODUCT_BATCH, toCreate.length)}/${toCreate.length}`)
    }
  }

  skipped = catalog.products.length - toCreate.length
  logger.info(`Done. Created: ${created}, Skipped (already existed): ${skipped}`)

  // -------------------------------------------------------------------------
  // Reconcile: ensure ALL products are linked to the sales channel
  // (catches products created via admin UI or other paths without the link)
  // -------------------------------------------------------------------------
  logger.info("Reconciling sales channel links...")
  const { data: allProductsForLink } = await query.graph({
    entity: "product",
    fields: ["id", "title", "sales_channels.id"],
  })
  const unlinked = allProductsForLink.filter(
    (prod: any) => !(prod.sales_channels ?? []).some((sc: any) => sc.id === salesChannelId)
  )
  if (unlinked.length) {
    await linkProductsToSalesChannelWorkflow(container).run({
      input: {
        data: [
          {
            sales_channel_id: salesChannelId,
            product_ids: unlinked.map((p: any) => p.id),
          },
        ],
      },
    })
    for (const p of unlinked) {
      logger.info(`Linked "${(p as any).title}" to sales channel`)
    }
  }
  logger.info(`Reconciliation done: ${unlinked.length} product(s) newly linked`)

  // -------------------------------------------------------------------------
  // Upload images (optional — skipped if FILE module unavailable)
  // -------------------------------------------------------------------------
  const withImages = toCreate.filter((p) => p.img_url)
  if (!withImages.length) {
    logger.info("No images to upload")
    return
  }

  logger.info(`Uploading images for ${withImages.length} products...`)

  // Fetch just-created products to get their IDs
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
  })
  const productIdByTitle = new Map(allProducts.map((p: any) => [p.title as string, p.id as string]))
  const productService = container.resolve(Modules.PRODUCT)

  let imgOk = 0
  let imgFail = 0

  for (const p of withImages) {
    const productId = productIdByTitle.get(p.title)
    if (!productId) continue

    try {
      const buf = await downloadBuffer(p.img_url!)
      const ext = (p.img_name?.split(".").pop() ?? "jpg").toLowerCase()
      const filename = p.img_name ?? `${slugify(p.title)}.${ext}`

      const [uploaded] = await fileService.createFiles([
        {
          filename,
          mimeType: ext === "png" ? "image/png" : "image/jpeg",
          content: buf.toString("base64"),
          access: "public",
        },
      ])

      await (productService as any).updateProducts(productId, {
        thumbnail: uploaded.url,
        images: [{ url: uploaded.url }],
      })

      imgOk++
    } catch (err: any) {
      logger.warn(`Image failed for "${p.title}": ${err.message}`)
      imgFail++
    }
  }

  logger.info(`Images: ${imgOk} uploaded, ${imgFail} failed`)
}
