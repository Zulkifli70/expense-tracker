// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
    '@vite-pwa/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Expense Tracker',
      short_name: 'Expenses',
      description: 'Track balances, expenses, and monthly budget usage.',
      theme_color: '#111827',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        {
          src: '/icons/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/icons/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      runtimeCaching: [
        {
          urlPattern: '/api/home',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-home',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60
            }
          }
        },
        {
          urlPattern: '/api/transactions',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-transactions',
            expiration: {
              maxEntries: 40,
              maxAgeSeconds: 60 * 60
            }
          }
        }
      ]
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true
    }
  },

  runtimeConfig: {
    mongodbUri: import.meta.env.MONGODB_URI || import.meta.env.MONGOURI || '',
    mongodbDb: import.meta.env.MONGODB_DB || 'ExpensesData',
    mongodbCustomersCollection: import.meta.env.MONGODB_CUSTOMERS_COLLECTION || 'UserData',
    mongodbUsersCollection: import.meta.env.MONGODB_USERS_COLLECTION || 'users',
    mongodbAccountsCollection: import.meta.env.MONGODB_ACCOUNTS_COLLECTION || 'accounts',
    mongodbCategoriesCollection: import.meta.env.MONGODB_CATEGORIES_COLLECTION || 'categories',
    mongodbTransactionsCollection: import.meta.env.MONGODB_TRANSACTIONS_COLLECTION || 'transactions',
    mongodbBudgetsCollection: import.meta.env.MONGODB_BUDGETS_COLLECTION || 'budgets',
    mongodbBudgetUsagesCollection: import.meta.env.MONGODB_BUDGET_USAGES_COLLECTION || 'budget_usages',
    mongodbNotificationsCollection: import.meta.env.MONGODB_NOTIFICATIONS_COLLECTION || 'notifications',
    mongodbDefaultUserId: import.meta.env.MONGODB_DEFAULT_USER_ID || 'demo-user',
    mongodbIpFamily: import.meta.env.MONGODB_IP_FAMILY || '',
    mongodbServerSelectionTimeoutMs: Number(import.meta.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000)
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
