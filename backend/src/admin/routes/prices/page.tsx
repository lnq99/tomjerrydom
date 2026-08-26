import { defineRouteConfig } from '@medusajs/admin-sdk'
import { CurrencyDollar } from '@medusajs/icons'
import { Button, Heading, Input, Select, Switch, Text, toast } from '@medusajs/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sdk } from '../../lib/sdk'

export const config = defineRouteConfig({
  label: 'Prices',
  icon: CurrencyDollar,
})

type Variant = {
  id: string
  title: string
  sku: string | null
  prices: { id: string; currency_code: string; amount: number }[]
}

type Product = {
  id: string
  title: string
  variants: Variant[]
}

// productId → currencyCode → amount string  (bulk mode)
// variantId → currencyCode → amount string  (per-variant mode)
type DraftPrices = Record<string, Record<string, string>>

export default function PricesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [currencies, setCurrencies] = useState<string[]>(['rub'])
  const [selectedCurrency, setSelectedCurrency] = useState('rub')
  const [bulkMode, setBulkMode] = useState(true)
  const [draft, setDraft] = useState<DraftPrices>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const dirty = useRef(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      let allProducts: Product[] = []
      let offset = 0
      while (true) {
        const res = await sdk.admin.product.list({
          limit: 50,
          offset,
          fields: 'id,title,*variants,*variants.prices',
        } as Parameters<typeof sdk.admin.product.list>[0])
        allProducts = allProducts.concat(res.products as unknown as Product[])
        if (res.products.length < 50) break
        offset += 50
      }

      const currencySet = new Set<string>(['rub'])
      const variantDraft: DraftPrices = {}
      const productDraft: DraftPrices = {}

      for (const product of allProducts) {
        productDraft[product.id] = {}
        for (const variant of product.variants ?? []) {
          variantDraft[variant.id] = {}
          for (const price of variant.prices ?? []) {
            currencySet.add(price.currency_code)
            const amount = String(price.amount / 100)
            variantDraft[variant.id][price.currency_code] = amount
            // In bulk mode show the first variant's prices; overwrite only if not yet set
            if (!(price.currency_code in productDraft[product.id])) {
              productDraft[product.id][price.currency_code] = amount
            }
          }
        }
      }

      setProducts(allProducts)
      setCurrencies(Array.from(currencySet).sort())
      setDraft({ ...variantDraft, ...productDraft })
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(id: string, currency: string, value: string) {
    dirty.current = true
    setDraft((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [currency]: value },
    }))
  }

  async function save() {
    setSaving(true)
    let errors = 0
    try {
      for (const product of products) {
        for (const variant of product.variants ?? []) {
          // In bulk mode the price comes from the product row; in variant mode from the variant row
          const source = bulkMode ? draft[product.id] : draft[variant.id]
          const prices = Object.entries(source ?? {})
            .filter(([, v]) => v !== '' && !isNaN(Number(v)))
            .map(([currency_code, v]) => ({
              currency_code,
              amount: Math.round(Number(v) * 100),
            }))
          if (!prices.length) continue
          try {
            await sdk.admin.product.updateVariant(product.id, variant.id, {
              prices,
            } as Parameters<typeof sdk.admin.product.updateVariant>[2])
          } catch {
            errors++
          }
        }
      }
      if (errors === 0) {
        toast.success('Prices saved')
        dirty.current = false
        await load()
      } else {
        toast.error(`Saved with ${errors} error(s)`)
      }
    } finally {
      setSaving(false)
    }
  }

  const displayCurrencies = useMemo(
    () => (currencies.includes(selectedCurrency) ? currencies : [selectedCurrency, ...currencies]),
    [currencies, selectedCurrency]
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Text className="text-ui-fg-muted">Loading…</Text>
      </div>
    )
  }

  const rows: { id: string; label: string; sub?: string }[] = bulkMode
    ? products.map((p) => ({ id: p.id, label: p.title }))
    : products.flatMap((p) =>
        (p.variants ?? []).map((v, i) => ({
          id: v.id,
          label: i === 0 ? p.title : '',
          sub: v.title,
        }))
      )

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Heading level="h1">Price Editor</Heading>
        <Button onClick={save} isLoading={saving} disabled={saving}>
          Save
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
        <div className="flex items-center gap-2">
          <Switch
            id="bulk-mode"
            checked={bulkMode}
            onCheckedChange={setBulkMode}
          />
          <label htmlFor="bulk-mode" className="text-sm text-ui-fg-subtle cursor-pointer select-none">
            Same price for all variants
          </label>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Text className="text-sm text-ui-fg-muted">Currency:</Text>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <Select.Trigger className="w-28">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {displayCurrencies.map((c) => (
                <Select.Item key={c} value={c}>
                  {c.toUpperCase()}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-ui-border-base">
        <table className="w-full text-sm">
          <thead className="bg-ui-bg-subtle">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle">Product</th>
              {!bulkMode && (
                <th className="px-3 py-2 text-left font-medium text-ui-fg-subtle w-32">Variant</th>
              )}
              {displayCurrencies.map((c) => (
                <th key={c} className="px-3 py-2 text-right font-medium text-ui-fg-subtle w-32">
                  {c.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border-base">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-ui-bg-subtle/50">
                <td className="px-3 py-1.5 text-ui-fg-base">
                  {row.label && <span className={row.sub ? 'font-medium' : ''}>{row.label}</span>}
                </td>
                {!bulkMode && (
                  <td className="px-3 py-1.5 text-ui-fg-subtle">{row.sub}</td>
                )}
                {displayCurrencies.map((c) => (
                  <td key={c} className="px-3 py-1.5 text-right">
                    <Input
                      type="number"
                      className="w-full text-right"
                      placeholder="—"
                      value={draft[row.id]?.[c] ?? ''}
                      onChange={(e) => handleChange(row.id, c, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} isLoading={saving} disabled={saving}>
          Save
        </Button>
      </div>
    </div>
  )
}
