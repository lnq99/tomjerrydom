export interface Env {
  CART_KV: KVNamespace
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET: string
  MEDUSA_BACKEND_URL: string
  MEDUSA_API_KEY: string
}

// Telegram update types (minimal — extend as needed)
export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  text?: string
}

export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

export interface TelegramUser {
  id: number
  first_name: string
  username?: string
}

export interface TelegramChat {
  id: number
}

// Cart types — mirrors pos-logic but framework-agnostic, no backend import
export interface BotCartItem {
  variantId: string
  productTitle: string
  variantTitle: string
  unitPrice: number
  quantity: number
}

export interface BotCart {
  items: BotCartItem[]
  currencyCode: string
}
