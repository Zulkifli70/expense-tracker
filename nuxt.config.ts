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
    mongodbUri: process.env.MONGODB_URI || process.env.MONGOURI || '',
    mongodbDb: process.env.MONGODB_DB || 'ExpensesData',
    mongodbCustomersCollection: process.env.MONGODB_CUSTOMERS_COLLECTION || 'UserData',
    mongodbUsersCollection: process.env.MONGODB_USERS_COLLECTION || 'users',
    mongodbAccountsCollection: process.env.MONGODB_ACCOUNTS_COLLECTION || 'accounts',
    mongodbCategoriesCollection: process.env.MONGODB_CATEGORIES_COLLECTION || 'categories',
    mongodbTransactionsCollection: process.env.MONGODB_TRANSACTIONS_COLLECTION || 'transactions',
    mongodbBudgetsCollection: process.env.MONGODB_BUDGETS_COLLECTION || 'budgets',
    mongodbBudgetUsagesCollection: process.env.MONGODB_BUDGET_USAGES_COLLECTION || 'budget_usages',
    mongodbDefaultUserId: process.env.MONGODB_DEFAULT_USER_ID || 'demo-user'
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
