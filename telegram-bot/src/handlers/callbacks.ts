import { tgApi, kbd } from '../lib/telegram'
import { medusaClient } from '../lib/medusa'
import {
  getCart,
  saveCart,
  clearCart,
  addItem,
  removeItem,
  renderCart,
  formatPrice,
} from '../lib/cart'
import type { Env, TelegramCallbackQuery } from '../lib/types'

export async function handleCallback(cq: TelegramCallbackQuery, env: Env) {
  const chatId = cq.message?.chat.id
  if (!chatId) return

  const tg = tgApi(env)
  const data = cq.data ?? ''

  await tg.answerCallbackQuery(cq.id)

  if (data.startsWith('product:')) {
    await handleProductDetail(chatId, data.slice(8), env)
    return
  }

  if (data.startsWith('add:')) {
    // format: add:<productId>:<variantId>
    const [productId, variantId] = data.slice(4).split(':')
    await handleAddToCart(chatId, productId, variantId, env)
    return
  }

  if (data.startsWith('remove:')) {
    await handleRemoveFromCart(chatId, data.slice(7), env)
    return
  }

  if (data === 'clear_cart') {
    await clearCart(env, chatId)
    await tg.sendMessage(chatId, 'Корзина очищена.')
    return
  }

  if (data === 'checkout') {
    const cart = await getCart(env, chatId)
    if (cart.items.length === 0) {
      await tg.sendMessage(chatId, 'Корзина пуста.')
      return
    }
    // TODO Phase 4: YooKassa payment link
    await tg.sendMessage(
      chatId,
      `${renderCart(cart)}\n\nОплата картой будет доступна после Phase 4.`
    )
    return
  }
}

async function handleProductDetail(chatId: number, productId: string, env: Env) {
  const tg = tgApi(env)
  const medusa = medusaClient(env)

  let product
  try {
    product = await medusa.getProduct(productId)
  } catch {
    await tg.sendMessage(chatId, 'Не удалось загрузить товар.')
    return
  }

  const variants = product.variants ?? []

  if (variants.length === 1) {
    const v = variants[0]
    const price = v.calculated_price
      ? formatPrice(v.calculated_price.calculated_amount)
      : 'Цена не указана'

    await tg.sendMessage(
      chatId,
      `<b>${product.title}</b>\nЦена: ${price}`,
      kbd([
        [{ text: `🛒 Добавить в корзину`, callback_data: `add:${productId}:${v.id}` }],
        [{ text: '← Назад к каталогу', callback_data: 'catalog' }],
      ])
    )
    return
  }

  const rows = variants.map((v) => {
    const price = v.calculated_price
      ? formatPrice(v.calculated_price.calculated_amount)
      : '—'
    return [{ text: `${v.title} — ${price}`, callback_data: `add:${productId}:${v.id}` }]
  })

  await tg.sendMessage(
    chatId,
    `<b>${product.title}</b>\nВыберите вариант:`,
    kbd([...rows, [{ text: '← Назад к каталогу', callback_data: 'catalog' }]])
  )
}

async function handleAddToCart(
  chatId: number,
  productId: string,
  variantId: string,
  env: Env
) {
  const tg = tgApi(env)
  const medusa = medusaClient(env)

  let product
  try {
    product = await medusa.getProduct(productId)
  } catch {
    await tg.sendMessage(chatId, 'Не удалось добавить товар.')
    return
  }

  const variant = product.variants.find((v) => v.id === variantId)
  if (!variant) {
    await tg.sendMessage(chatId, 'Вариант не найден.')
    return
  }

  const unitPrice = variant.calculated_price?.calculated_amount ?? 0
  const cart = await getCart(env, chatId)
  const updated = addItem(cart, {
    variantId,
    productTitle: product.title,
    variantTitle: variant.title,
    unitPrice,
    quantity: 1,
  })
  await saveCart(env, chatId, updated)

  await tg.sendMessage(
    chatId,
    `✅ <b>${product.title}</b> добавлен в корзину.\n\n/cart — посмотреть корзину`
  )
}

async function handleRemoveFromCart(chatId: number, variantId: string, env: Env) {
  const tg = tgApi(env)
  const cart = await getCart(env, chatId)
  const updated = removeItem(cart, variantId)
  await saveCart(env, chatId, updated)
  await tg.sendMessage(chatId, `Товар удалён.\n\n${renderCart(updated)}`)
}
