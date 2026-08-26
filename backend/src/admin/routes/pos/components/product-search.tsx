import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input, Text, clx, FocusModal, Button } from '@medusajs/ui'
import { MagnifyingGlass, XMark } from '@medusajs/icons'
import { sdk } from '../../../lib/sdk'
import type { PosLineItem } from '../../../../modules/pos-logic'
import type { HttpTypes } from '@medusajs/framework/types'

type Props = {
  onAddItem: (item: PosLineItem) => void
}

function formatRub(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

export function ProductSearch({ onAddItem }: Props) {
  const [search, setSearch] = useState('')
  const [pickerProduct, setPickerProduct] = useState<HttpTypes.AdminProduct | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: () =>
      sdk.admin.product.list({
        limit: 50,
        q: search || undefined,
        status: ['published'],
        fields: 'id,title,thumbnail,*variants,*variants.calculated_price',
      }),
    staleTime: 30_000,
  })

  const products = data?.products ?? []

  function handleCardTap(product: HttpTypes.AdminProduct) {
    const variants = product.variants ?? []
    if (variants.length === 1) {
      const v = variants[0]
      onAddItem({
        variantId: v.id!,
        quantity: 1,
        unitPrice: (v as any)?.calculated_price?.calculated_amount ?? 0,
      })
    } else {
      setPickerProduct(product)
    }
  }

  function handleVariantPick(variant: HttpTypes.AdminProductVariant) {
    onAddItem({
      variantId: variant.id!,
      quantity: 1,
      unitPrice: (variant as any)?.calculated_price?.calculated_amount ?? 0,
    })
    setPickerProduct(null)
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative">
        <MagnifyingGlass className="text-ui-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <Text className="text-ui-fg-muted">Загрузка...</Text>
        </div>
      )}

      <div className="grid flex-1 auto-rows-max grid-cols-2 gap-3 overflow-y-auto pb-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onTap={handleCardTap}
          />
        ))}
        {!isLoading && products.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-8">
            <Text className="text-ui-fg-muted">Ничего не найдено</Text>
          </div>
        )}
      </div>

      {/* Variant picker modal */}
      {pickerProduct && (
        <VariantPicker
          product={pickerProduct}
          onPick={handleVariantPick}
          onClose={() => setPickerProduct(null)}
        />
      )}
    </div>
  )
}

function ProductCard({
  product,
  onTap,
}: {
  product: HttpTypes.AdminProduct
  onTap: (product: HttpTypes.AdminProduct) => void
}) {
  const variants = product.variants ?? []
  const firstVariant = variants[0]

  const price = useMemo(() => {
    if (variants.length > 1) return null
    const p = (firstVariant as any)?.calculated_price?.calculated_amount
    if (p == null) return null
    return formatRub(p)
  }, [firstVariant, variants.length])

  return (
    <button
      type="button"
      onClick={() => onTap(product)}
      className={clx(
        'bg-ui-bg-base border-ui-border-base hover:bg-ui-bg-base-hover active:bg-ui-bg-base-pressed',
        'flex flex-col overflow-hidden rounded-lg border text-left transition-colors',
        'focus-visible:shadow-borders-focus outline-none'
      )}
    >
      {product.thumbnail ? (
        <img
          src={product.thumbnail}
          alt={product.title ?? ''}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="bg-ui-bg-subtle aspect-square w-full" />
      )}
      <div className="flex flex-col gap-0.5 p-2">
        <Text size="small" weight="plus" className="line-clamp-2">
          {product.title}
        </Text>
        {variants.length > 1 ? (
          <Text size="xsmall" className="text-ui-fg-muted">
            {variants.length} вариантов →
          </Text>
        ) : price ? (
          <Text size="small" className="text-ui-fg-base mt-0.5">
            {price}
          </Text>
        ) : null}
      </div>
    </button>
  )
}

function VariantPicker({
  product,
  onPick,
  onClose,
}: {
  product: HttpTypes.AdminProduct
  onPick: (variant: HttpTypes.AdminProductVariant) => void
  onClose: () => void
}) {
  const variants = product.variants ?? []

  return (
    <FocusModal open onOpenChange={(open) => { if (!open) onClose() }}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center gap-3">
            {product.thumbnail && (
              <img
                src={product.thumbnail}
                alt={product.title ?? ''}
                className="h-10 w-10 rounded object-cover"
              />
            )}
            <div>
              <Text weight="plus">{product.title}</Text>
              <Text size="small" className="text-ui-fg-muted">Выберите вариант</Text>
            </div>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-2 p-6">
          {variants.map((variant) => {
            const amount = (variant as any)?.calculated_price?.calculated_amount
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => onPick(variant)}
                className={clx(
                  'bg-ui-bg-base border-ui-border-base hover:bg-ui-bg-base-hover active:bg-ui-bg-base-pressed',
                  'flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                  'focus-visible:shadow-borders-focus outline-none'
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <Text weight="plus">{variant.title}</Text>
                  {variant.sku && (
                    <Text size="xsmall" className="text-ui-fg-muted">
                      SKU: {variant.sku}
                    </Text>
                  )}
                </div>
                {amount != null ? (
                  <Text weight="plus" className="text-ui-fg-base shrink-0">
                    {formatRub(amount)}
                  </Text>
                ) : (
                  <Text size="small" className="text-ui-fg-muted shrink-0">
                    нет цены
                  </Text>
                )}
              </button>
            )
          })}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
