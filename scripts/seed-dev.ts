/**
 * Dev seed: wipes all regions, creates Russia/RUB, creates a publishable API key.
 *
 * Run from backend/:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpass npm run seed:dev
 *
 * ADMIN_EMAIL + ADMIN_PASSWORD = the credentials you used to create
 * the admin account in the Medusa admin UI (localhost:9000/app).
 */

const BASE_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpass npm run seed:dev')
  process.exit(1)
}

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

async function main() {
  // ── 1. Authenticate ─────────────────────────────────────────────────────────
  console.log('Authenticating…')
  const authRes = (await req('POST', '/auth/user/emailpass', {
    email: EMAIL,
    password: PASSWORD,
  })) as { token: string }
  const token = authRes.token
  console.log('  ✓ Got token')

  // ── 2. Delete all existing regions ──────────────────────────────────────────
  console.log('Fetching existing regions…')
  const regionsRes = (await req('GET', '/admin/regions?limit=100', undefined, token)) as {
    regions: { id: string; name: string }[]
  }
  for (const region of regionsRes.regions) {
    console.log(`  Deleting region: ${region.name} (${region.id})`)
    await req('DELETE', `/admin/regions/${region.id}`, undefined, token)
  }
  console.log(`  ✓ Deleted ${regionsRes.regions.length} region(s)`)

  // ── 3. Create Russia / RUB ───────────────────────────────────────────────────
  console.log('Creating Russia region…')
  const regionRes = (await req(
    'POST',
    '/admin/regions',
    {
      name: 'Russia',
      currency_code: 'rub',
      countries: ['ru'],
    },
    token
  )) as { region: { id: string } }
  const regionId = regionRes.region.id
  console.log(`  ✓ Created region: ${regionId}`)

  // ── 4. Create (or reuse) a sales channel ────────────────────────────────────
  console.log('Fetching sales channels…')
  const scRes = (await req('GET', '/admin/sales-channels?limit=1', undefined, token)) as {
    sales_channels: { id: string; name: string }[]
  }
  let salesChannelId: string
  if (scRes.sales_channels.length > 0) {
    salesChannelId = scRes.sales_channels[0].id
    console.log(`  ✓ Using existing sales channel: ${scRes.sales_channels[0].name}`)
  } else {
    const newSc = (await req(
      'POST',
      '/admin/sales-channels',
      { name: 'Default Sales Channel', description: 'Default' },
      token
    )) as { sales_channel: { id: string } }
    salesChannelId = newSc.sales_channel.id
    console.log(`  ✓ Created sales channel: ${salesChannelId}`)
  }

  // ── 5. Delete old publishable API keys, create a fresh one ──────────────────
  console.log('Cleaning up publishable API keys…')
  const keysRes = (await req(
    'GET',
    '/admin/api-keys?type=publishable&limit=100',
    undefined,
    token
  )) as { api_keys: { id: string; title: string }[] }
  for (const key of keysRes.api_keys) {
    await req('DELETE', `/admin/api-keys/${key.id}`, undefined, token)
  }
  console.log(`  ✓ Deleted ${keysRes.api_keys.length} old key(s)`)

  console.log('Creating publishable API key…')
  const keyRes = (await req(
    'POST',
    '/admin/api-keys',
    { title: 'Storefront', type: 'publishable' },
    token
  )) as { api_key: { id: string; token: string } }
  const pubKeyId = keyRes.api_key.id
  const pubKeyToken = keyRes.api_key.token

  // Attach the sales channel to the publishable key
  await req(
    'POST',
    `/admin/api-keys/${pubKeyId}/sales-channels`,
    { add: [salesChannelId] },
    token
  )
  console.log(`  ✓ Created key and linked to sales channel`)

  // ── 6. Link all products to the sales channel ────────────────────────────────
  console.log('Linking products to sales channel…')
  const productsRes = (await req(
    'GET',
    '/admin/products?limit=500&fields=id',
    undefined,
    token
  )) as { products: { id: string }[] }
  const productIds = productsRes.products.map((p) => p.id)
  if (productIds.length > 0) {
    await req(
      'POST',
      `/admin/sales-channels/${salesChannelId}/products`,
      { add: productIds },
      token
    )
    console.log(`  ✓ Linked ${productIds.length} product(s)`)
  }

  // ── 7. Summary ───────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────')
  console.log('Done! Update storefront/.env with:')
  console.log(`  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${pubKeyToken}`)
  console.log('────────────────────────────────────────\n')
}

main().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
