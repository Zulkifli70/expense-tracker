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
    mongodbCustomersCollection: import.meta.env.MONGODB_CUSTOMERS_COLLECTION || 'UserData'
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
