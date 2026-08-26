import { tgApi, kbd } from '../lib/telegram'
import { medusaClient } from '../lib/medusa'
import { getCart, renderCart, cartTotal, formatPrice, clearCart } from '../lib/cart'
import type { Env, TelegramMessage } from '../lib/types'

export async function handleCommand(msg: TelegramMessage, env: Env) {
  const chatId = msg.chat.id
  const text = msg.text ?? ''
  const tg = tgApi(env)

  if (text.startsWith('/start') || text.startsWith('/help')) {
    await tg.sendMessage(
      chatId,
      '👋 Добро пожаловать в TomJerryDom!\n\n' +
        '/catalog — посмотреть товары\n' +
        '/cart — ваша корзина\n' +
        '/checkout — оформить заказ'
    )
    return
  }

  if (text.startsWith('/catalog')) {
    await handleCatalog(chatId, env)
    return
  }

  if (text.startsWith('/cart')) {
    await handleCartView(chatId, env)
    return
  }

  if (text.startsWith('/checkout')) {
    await handleCheckout(chatId, env)
    return
  }
}

async function handleCatalog(chatId: number, env: Env) {
  const tg = tgApi(env)
  const medusa = medusaClient(env)

  let products
  try {
    products = await medusa.listProducts()
  } catch {
    await tg.sendMessage(chatId, 'Не удалось загрузить каталог. Попробуйте позже.')
    return
  }

  if (products.length === 0) {
    await tg.sendMessage(chatId, 'Каталог пуст.')
    return
  }

  const rows = products.slice(0, 10).map((p) => [
    { text: p.title, callback_data: `product:${p.id}` },
  ])

  await tg.sendMessage(chatId, '<b>Каталог товаров</b>\nВыберите товар:', kbd(rows))
}

async function handleCartView(chatId: number, env: Env) {
  const tg = tgApi(env)
  const cart = await getCart(env, chatId)
  const text = renderCart(cart)

  if (cart.items.length === 0) {
    await tg.sendMessage(chatId, text)
    return
  }

  const removeRows = cart.items.map((i) => [
    {
      text: `Удалить: ${i.productTitle}`,
      callback_data: `remove:${i.variantId}`,
    },
  ])

  await tg.sendMessage(chatId, text, kbd([
    ...removeRows,
    [{ text: '✅ Оформить заказ', callback_data: 'checkout' }],
    [{ text: '🗑 Очистить корзину', callback_data: 'clear_cart' }],
  ]))
}

async function handleCheckout(chatId: number, env: Env) {
  const tg = tgApi(env)
  const cart = await getCart(env, chatId)

  if (cart.items.length === 0) {
    await tg.sendMessage(chatId, 'Корзина пуста. Добавьте товары через /catalog.')
    return
  }

  const total = formatPrice(cartTotal(cart))

  // TODO Phase 4: create Medusa cart + order, get YooKassa payment link
  await tg.sendMessage(
    chatId,
    `🛒 Ваш заказ:\n\n${renderCart(cart)}\n\n` +
      `Оплата картой будет доступна после подключения YooKassa (Phase 4).\n\n` +
      `Для оплаты наличными свяжитесь с нами.`,
    kbd([[{ text: '🗑 Очистить корзину', callback_data: 'clear_cart' }]])
  )

  await clearCart(env, chatId)
}
