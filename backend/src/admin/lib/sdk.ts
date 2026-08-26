import Medusa from '@medusajs/js-sdk'

declare const __BACKEND_URL__: string

export const sdk = new Medusa({
  baseUrl: typeof __BACKEND_URL__ !== 'undefined' ? __BACKEND_URL__ : '/',
  debug: import.meta.env.DEV,
  auth: { type: 'session' },
})
