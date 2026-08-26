import type { Env } from './types'

type InlineKeyboardButton = {
  text: string
  callback_data?: string
  url?: string
}

type InlineKeyboard = { inline_keyboard: InlineKeyboardButton[][] }

export function tgApi(env: Env) {
  const base = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`

  async function call(method: string, body: Record<string, unknown>) {
    const res = await fetch(`${base}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Telegram ${method} failed: ${err}`)
    }
  }

  return {
    sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard) {
      return call('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...(keyboard ? { reply_markup: keyboard } : {}),
      })
    },

    editMessageText(
      chatId: number,
      messageId: number,
      text: string,
      keyboard?: InlineKeyboard
    ) {
      return call('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        ...(keyboard ? { reply_markup: keyboard } : {}),
      })
    },

    answerCallbackQuery(callbackQueryId: string, text?: string) {
      return call('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
      })
    },
  }
}

export function kbd(rows: InlineKeyboardButton[][]): InlineKeyboard {
  return { inline_keyboard: rows }
}
