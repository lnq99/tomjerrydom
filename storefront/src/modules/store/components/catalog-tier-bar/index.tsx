import { listTiers } from "@lib/data/tiers"
import { getTierId } from "@lib/data/cookies"
import NavTierDropdown from "@modules/tiers/components/nav-tier-dropdown"

export default async function CatalogTierBar() {
  const [tiers, currentTierId] = await Promise.all([listTiers(), getTierId()])
  if (tiers.length <= 1) return null

  return <NavTierDropdown tiers={tiers} currentTierId={currentTierId} />
}
