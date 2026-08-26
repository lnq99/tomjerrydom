import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import TierPicker from "@modules/tiers/components/tier-picker"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { getCurrentTier, listTiers } from "@lib/data/tiers"
import { getTierId } from "@lib/data/cookies"

export const metadata: Metadata = {
  title: "Medusa Next.js Starter Template",
  description:
    "A performant frontend ecommerce starter template with Next.js 15 and Medusa.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const [region, { collections }, tiers, currentTierId] = await Promise.all([
    getRegion(countryCode),
    listCollections({ fields: "id, handle, title" }),
    listTiers(),
    getTierId(),
  ])

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <Hero />

      {tiers.length > 0 && (
        <div className="content-container py-12 border-b border-ui-border-base">
          <TierPicker tiers={tiers} currentTierId={currentTierId} />
        </div>
      )}

      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  )
}
