import { defineRouteConfig } from '@medusajs/admin-sdk'
import { TablePen } from '@medusajs/icons'
import { Button, Heading, Text, toast } from '@medusajs/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type CellValueChangedEvent,
  type GetRowIdParams,
} from 'ag-grid-community'
import { sdk } from '../../lib/sdk'

ModuleRegistry.registerModules([AllCommunityModule])

export const config = defineRouteConfig({
  label: 'Catalog',
  icon: TablePen,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowData = {
  productId: string
  productTitle: string
  variantId: string
  variantTitle: string
  sku: string
  inventoryItemId: string | null
  locationId: string | null
  stock: number | null
  [key: string]: string | number | null
}

// ---------------------------------------------------------------------------
// Theme — quartz base, light-mode colours matching Medusa admin
// ---------------------------------------------------------------------------

const gridTheme = themeQuartz.withParams({
  accentColor: '#7C3AED',
  headerBackgroundColor: '#F9FAFB',
  headerTextColor: '#374151',
  rowHoverColor: '#F5F3FF',
  selectedRowBackgroundColor: '#EDE9FE',
  cellTextColor: '#111827',
  fontSize: 13,
  rowHeight: 36,
  headerHeight: 38,
  cellHorizontalPaddingScale: 0.8,
})

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function CatalogPage() {
  const [rowData, setRowData] = useState<RowData[]>([])
  const [currencies, setCurrencies] = useState<string[]>(['rub'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirtyCount, setDirtyCount] = useState(0)

  // variantId → full current row snapshot (updated on every cell change)
  const dirtyRows = useRef<Map<string, RowData>>(new Map())

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true)
    dirtyRows.current.clear()
    setDirtyCount(0)
    try {
      // 1. Products + variants + prices + inventory items
      let allProducts: any[] = []
      let offset = 0
      while (true) {
        const res = await sdk.admin.product.list({
          limit: 50,
          offset,
          fields: 'id,title,*variants,*variants.prices,*variants.inventory_items',
        } as Parameters<typeof sdk.admin.product.list>[0])
        allProducts = allProducts.concat(res.products)
        if ((res.products as any[]).length < 50) break
        offset += 50
      }

      // 2. Stock locations (take first one)
      let locationId: string | null = null
      try {
        const locRes: any = await sdk.client.fetch('/admin/stock-locations?limit=1')
        locationId = locRes.stock_locations?.[0]?.id ?? null
      } catch { /* no locations configured */ }

      // 3. Inventory levels per inventory item
      const inventoryLevels: Record<string, number> = {}
      if (locationId) {
        try {
          let invOffset = 0
          while (true) {
            const invRes: any = await sdk.client.fetch(
              `/admin/inventory-items?location_id=${locationId}&fields=id,*location_levels&limit=100&offset=${invOffset}`
            )
            const items: any[] = invRes.inventory_items ?? []
            for (const item of items) {
              const level = (item.location_levels ?? []).find(
                (l: any) => l.location_id === locationId
              )
              if (level) inventoryLevels[item.id] = level.stocked_quantity
            }
            if (items.length < 100) break
            invOffset += 100
          }
        } catch { /* skip stock if inventory API fails */ }
      }

      // 4. Derive currencies
      const currencySet = new Set<string>(['rub'])
      for (const p of allProducts) {
        for (const v of (p.variants ?? [])) {
          for (const pr of (v.prices ?? [])) currencySet.add(pr.currency_code)
        }
      }
      const sortedCurrencies = Array.from(currencySet).sort()
      setCurrencies(sortedCurrencies)

      // 5. Build rows (one row per variant)
      const rows: RowData[] = []
      for (const product of allProducts) {
        for (const variant of (product.variants ?? [])) {
          const invItem = variant.inventory_items?.[0]
          const inventoryItemId: string | null =
            invItem?.inventory_item_id ?? invItem?.id ?? null

          const row: RowData = {
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            variantTitle: variant.title ?? '',
            sku: variant.sku ?? '',
            inventoryItemId,
            locationId,
            stock: inventoryItemId != null ? (inventoryLevels[inventoryItemId] ?? null) : null,
          }

          for (const price of (variant.prices ?? [])) {
            row[`price_${price.currency_code}`] = price.amount / 100
          }

          rows.push(row)
        }
      }

      setRowData(rows)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ---------------------------------------------------------------------------
  // Column definitions
  // ---------------------------------------------------------------------------

  const dirtyStyle = { backgroundColor: '#FEF3C7' }

  const colDefs = useMemo<ColDef[]>(() => {
    const isDirty = (params: any) =>
      dirtyRows.current.has(params.data?.variantId)

    const baseColumns: ColDef[] = [
      {
        field: 'productTitle',
        headerName: 'Product',
        editable: true,
        pinned: 'left',
        width: 220,
        cellStyle: (p) => (isDirty(p) ? dirtyStyle : null),
        tooltipValueGetter: () => 'Shared across all variants — editing updates the product',
      },
      {
        field: 'variantTitle',
        headerName: 'Variant',
        editable: true,
        width: 160,
        cellStyle: (p) => (isDirty(p) ? dirtyStyle : null),
      },
      {
        field: 'sku',
        headerName: 'SKU',
        editable: true,
        width: 130,
        cellStyle: (p) => (isDirty(p) ? dirtyStyle : null),
      },
      {
        field: 'stock',
        headerName: 'Stock',
        editable: true,
        type: 'numericColumn',
        width: 90,
        valueParser: (p) => (p.newValue === '' || p.newValue == null ? null : Number(p.newValue)),
        valueFormatter: (p) => (p.value == null ? '—' : String(p.value)),
        cellStyle: (p) => (isDirty(p) ? dirtyStyle : null),
      },
    ]

    const priceColumns: ColDef[] = currencies.map((c) => ({
      field: `price_${c}`,
      headerName: c.toUpperCase(),
      editable: true,
      type: 'numericColumn',
      width: 110,
      valueParser: (p: any) =>
        p.newValue === '' || p.newValue == null ? null : Number(p.newValue),
      valueFormatter: (p: any) => (p.value == null ? '' : String(p.value)),
      cellStyle: (p: any) => (isDirty(p) ? dirtyStyle : null),
    }))

    return [...baseColumns, ...priceColumns]
  }, [currencies])

  // ---------------------------------------------------------------------------
  // Cell edit tracking
  // ---------------------------------------------------------------------------

  function onCellValueChanged(event: CellValueChangedEvent) {
    const row = event.data as RowData
    dirtyRows.current.set(row.variantId, { ...row })
    setDirtyCount(dirtyRows.current.size)
    // Force cell re-style by refreshing the row
    event.api.refreshCells({ rowNodes: [event.node], force: true })
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function save() {
    if (dirtyRows.current.size === 0) return
    setSaving(true)
    let errors = 0
    const savedProductIds = new Set<string>()

    for (const [, row] of dirtyRows.current) {
      try {
        // Product title (only once per product)
        if (!savedProductIds.has(row.productId)) {
          savedProductIds.add(row.productId)
          // Find all dirty rows for this product to get latest title
          const title = [...dirtyRows.current.values()]
            .find((r) => r.productId === row.productId)?.productTitle
          if (title !== undefined) {
            await sdk.admin.product.update(row.productId, { title } as any)
          }
        }

        // Variant update — title, sku, prices
        const variantUpdate: Record<string, any> = {}
        variantUpdate.title = row.variantTitle
        variantUpdate.sku = row.sku

        // Build complete prices array from all currency fields in this row
        const prices = currencies
          .map((c) => {
            const val = row[`price_${c}`]
            if (val === null || val === undefined || val === '') return null
            const amount = Math.round(Number(val) * 100)
            return isNaN(amount) ? null : { currency_code: c, amount }
          })
          .filter(Boolean)

        if (prices.length > 0) variantUpdate.prices = prices

        await sdk.admin.product.updateVariant(row.productId, row.variantId, variantUpdate as any)

        // Stock update
        if (
          row.stock !== null &&
          row.inventoryItemId &&
          row.locationId
        ) {
          await sdk.client.fetch(
            `/admin/inventory-items/${row.inventoryItemId}/location-levels/${row.locationId}`,
            { method: 'POST', body: { stocked_quantity: Number(row.stock) } }
          )
        }
      } catch (e) {
        console.error('Save error for variant', row.variantId, e)
        errors++
      }
    }

    if (errors === 0) {
      toast.success(`Saved ${dirtyRows.current.size} row(s)`)
      await load()
    } else {
      toast.error(`Saved with ${errors} error(s) — check console`)
      await load()
    }
    setSaving(false)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-screen flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ui-border-base bg-ui-bg-base px-6 py-4">
        <div>
          <Heading level="h1">Catalog Editor</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Edit product names, variants, SKUs, prices, and stock inline — then hit Save.
          </Text>
        </div>
        <div className="flex items-center gap-3">
          {dirtyCount > 0 && (
            <Text size="small" className="text-ui-fg-subtle">
              {dirtyCount} unsaved row{dirtyCount !== 1 ? 's' : ''}
            </Text>
          )}
          <Button
            variant="secondary"
            size="small"
            onClick={load}
            disabled={loading || saving}
          >
            Refresh
          </Button>
          <Button
            size="small"
            onClick={save}
            isLoading={saving}
            disabled={saving || dirtyCount === 0}
          >
            Save changes
          </Button>
        </div>
      </div>

      {/* Hint bar */}
      <div className="flex items-center gap-4 border-b border-ui-border-base bg-ui-bg-subtle px-6 py-1.5">
        <Text size="xsmall" className="text-ui-fg-muted">
          Double-click or press <kbd className="rounded bg-ui-bg-base px-1 font-mono text-xs">F2</kbd> to edit a cell
        </Text>
        <Text size="xsmall" className="text-ui-fg-muted">
          <kbd className="rounded bg-ui-bg-base px-1 font-mono text-xs">Tab</kbd> moves right,{' '}
          <kbd className="rounded bg-ui-bg-base px-1 font-mono text-xs">Enter</kbd> moves down
        </Text>
        <Text size="xsmall" className="text-ui-fg-muted">
          <kbd className="rounded bg-ui-bg-base px-1 font-mono text-xs">Ctrl+C/V</kbd> copy-paste
        </Text>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded bg-amber-100 border border-amber-200" />
          <Text size="xsmall" className="text-ui-fg-muted">= unsaved</Text>
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Text className="text-ui-fg-muted">Loading catalog…</Text>
          </div>
        ) : (
          <AgGridReact
            theme={gridTheme}
            rowData={rowData}
            columnDefs={colDefs}
            getRowId={(p: GetRowIdParams) => p.data.variantId}
            onCellValueChanged={onCellValueChanged}
            // Excel-like editing UX
            enterNavigatesVertically
            enterNavigatesVerticallyAfterEdit
            stopEditingWhenCellsLoseFocus
            undoRedoCellEditing
            undoRedoCellEditingLimit={20}
            // Selection
            rowSelection={{ mode: 'multiRow', checkboxes: false }}
            // Copy-paste
            copyHeadersToClipboard
            // Layout
            domLayout="normal"
            suppressMovableColumns={false}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
              suppressHeaderMenuButton: false,
            }}
          />
        )}
      </div>
    </div>
  )
}
