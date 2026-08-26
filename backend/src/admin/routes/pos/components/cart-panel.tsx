import { Button, Heading, Text, IconButton, toast } from '@medusajs/ui'
import { Minus, Plus, Trash } from '@medusajs/icons'
import type { PosCart, PosLineItem } from '../../../../modules/pos-logic'

type Props = {
  cart: PosCart
  total: number
  onUpdateQty: (variantId: string, quantity: number) => void
  onRemove: (variantId: string) => void
  onClear: () => void
}

export function CartPanel({ cart, total, onUpdateQty, onRemove, onClear }: Props) {
  const formattedTotal = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(total / 100)

  function handleCashPayment() {
    if (cart.items.length === 0) return
    // TODO Phase 4: replace with YooKassa workflow call
    toast.success(`Оплата наличными: ${formattedTotal}`)
    onClear()
  }

  return (
    <div className="bg-ui-bg-subtle border-ui-border-base flex h-full flex-col rounded-lg border">
      <div className="border-ui-border-base border-b px-4 py-3">
        <Heading level="h2">Корзина</Heading>
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Text className="text-ui-fg-muted">Корзина пуста</Text>
          </div>
        ) : (
          <ul className="divide-ui-border-base divide-y">
            {cart.items.map((item) => (
              <CartItem
                key={item.variantId}
                item={item}
                onUpdateQty={onUpdateQty}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="border-ui-border-base space-y-3 border-t px-4 py-4">
        <div className="flex items-center justify-between">
          <Text weight="plus">Итого</Text>
          <Heading level="h2">{formattedTotal}</Heading>
        </div>

        <Button
          className="w-full"
          size="large"
          disabled={cart.items.length === 0}
          onClick={handleCashPayment}
        >
          Оплатить наличными
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          size="large"
          disabled
          title="YooKassa — будет добавлено в Phase 4"
        >
          Оплатить картой
        </Button>
      </div>
    </div>
  )
}

function CartItem({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: PosLineItem
  onUpdateQty: (variantId: string, quantity: number) => void
  onRemove: (variantId: string) => void
}) {
  const lineTotal = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format((item.unitPrice * item.quantity) / 100)

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 overflow-hidden">
        <Text size="small" weight="plus" className="truncate">
          {item.variantId}
        </Text>
        <Text size="xsmall" className="text-ui-fg-muted">
          {lineTotal}
        </Text>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          size="small"
          variant="transparent"
          onClick={() => onUpdateQty(item.variantId, item.quantity - 1)}
        >
          <Minus />
        </IconButton>
        <Text className="w-6 text-center" size="small">
          {item.quantity}
        </Text>
        <IconButton
          size="small"
          variant="transparent"
          onClick={() => onUpdateQty(item.variantId, item.quantity + 1)}
        >
          <Plus />
        </IconButton>
      </div>

      <IconButton
        size="small"
        variant="transparent"
        onClick={() => onRemove(item.variantId)}
      >
        <Trash />
      </IconButton>
    </li>
  )
}
