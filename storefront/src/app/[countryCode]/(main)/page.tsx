import { Metadata } from "next"

import AboutStore from "@modules/home/components/about-store"
import FeaturedProducts from "@modules/home/components/featured-products"
import FeaturedProductsSection from "@modules/home/components/featured-products-section"
import LandingShell from "@modules/home/components/landing-shell"
import Reels from "@modules/home/components/reels"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Tom&Jerry Дом",
  description: "Оптовый магазин товаров для дома",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params

  const [region, { collections }] = await Promise.all([
    getRegion(countryCode),
    listCollections({ fields: "id, handle, title" }),
  ])

  if (!collections || !region) {
    return null
  }

  return (
    <LandingShell>
      <FeaturedProductsSection>
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </FeaturedProductsSection>

      <Reels />

      <AboutStore />
    </LandingShell>
  )
}
