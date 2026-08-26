import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input, Text, clx } from '@medusajs/ui'
import { MagnifyingGlass } from '@medusajs/icons'
import { sdk } from '../../../lib/sdk'
import type { PosLineItem } from '../../../../modules/pos-logic'
import type { HttpTypes } from '@medusajs/framework/types'

type Props = {
  onAddItem: (item: PosLineItem) => void
}

export function ProductSearch({ onAddItem }: Props) {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: () =>
      sdk.admin.product.list({
        limit: 50,
        q: search || undefined,
        status: ['published'],
        fields: 'id,title,thumbnail,variants.id,variants.title,variants.calculated_price',
      }),
    staleTime: 30_000,
  })

  const products = data?.products ?? []

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
            onAddItem={onAddItem}
          />
        ))}
        {!isLoading && products.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-8">
            <Text className="text-ui-fg-muted">Ничего не найдено</Text>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductCard({
  product,
  onAddItem,
}: {
  product: HttpTypes.AdminProduct
  onAddItem: (item: PosLineItem) => void
}) {
  const variants = product.variants ?? []
  const firstVariant = variants[0]

  const price = useMemo(() => {
    const p = (firstVariant as any)?.calculated_price?.calculated_amount
    if (p == null) return null
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(p / 100)
  }, [firstVariant])

  function handleTap() {
    if (!firstVariant) return
    const unitPrice =
      (firstVariant as any)?.calculated_price?.calculated_amount ?? 0
    onAddItem({
      variantId: firstVariant.id!,
      quantity: 1,
      unitPrice,
    })
  }

  return (
    <button
      type="button"
      onClick={handleTap}
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
        {variants.length > 1 && (
          <Text size="xsmall" className="text-ui-fg-muted">
            {variants.length} вариантов
          </Text>
        )}
        {price && (
          <Text size="small" className="text-ui-fg-base mt-0.5">
            {price}
          </Text>
        )}
      </div>
    </button>
  )
}
