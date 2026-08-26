import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    },
  },

  modules: [
    // -----------------------------------------------------------------
    // Event bus — Redis when available, in-memory fallback
    // To drop Redis: remove redisUrl above, delete this block, and
    // Medusa will use the in-memory event bus automatically.
    // -----------------------------------------------------------------
    {
      resolve: '@medusajs/medusa/event-bus-redis',
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },

    // -----------------------------------------------------------------
    // Cache — Redis when available, in-memory fallback
    // Same removal path as event bus above.
    // -----------------------------------------------------------------
    {
      resolve: '@medusajs/medusa/cache-redis',
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },

    // -----------------------------------------------------------------
    // File storage — local filesystem in dev, Cloudflare R2 in prod.
    // R2 quirks:
    //   • region must be "auto" (not "us-east-1" or similar)
    //   • AWS SDK checksum bug: @aws-sdk/client-s3 >=3.729.0 sends
    //     checksums R2 rejects — pinned to 3.726.1 via package.json overrides
    // -----------------------------------------------------------------
    ...(process.env.R2_ACCESS_KEY_ID
      ? [{
          resolve: '@medusajs/medusa/file',
          options: {
            providers: [
              {
                resolve: '@medusajs/medusa/file-s3',
                id: 's3',
                options: {
                  file_url: process.env.R2_PUBLIC_URL,
                  access_key_id: process.env.R2_ACCESS_KEY_ID,
                  secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
                  region: 'auto',
                  bucket: process.env.R2_BUCKET_NAME,
                  endpoint: process.env.R2_ENDPOINT,
                },
              },
            ],
          },
        }]
      : []),
  ],
})
