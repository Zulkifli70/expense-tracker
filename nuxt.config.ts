// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
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
