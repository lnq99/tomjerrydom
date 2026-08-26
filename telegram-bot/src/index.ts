import { handleCommand } from './handlers/commands'
import { handleCallback } from './handlers/callbacks'
import type { Env, TelegramUpdate } from './lib/types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    // Validate Telegram webhook secret
    const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    let update: TelegramUpdate
    try {
      update = await request.json()
    } catch {
      return new Response('Bad Request', { status: 400 })
    }

    try {
      if (update.message?.text) {
        await handleCommand(update.message, env)
      } else if (update.callback_query) {
        await handleCallback(update.callback_query, env)
      }
    } catch (err) {
      console.error('Update handling error:', err)
      // Always return 200 to Telegram — retries cause duplicate processing
    }

    return new Response('OK')
  },
} satisfies ExportedHandler<Env>
