// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    restructureDir: false,
    baseUrl: 'https://abwaab.com',
    locales: [
      {
        code: 'en',
        country: '',
        language: 'en',
        lang: 'en',
        file: 'en-en.js',
        dir: 'ltr'
      },
      {
        code: 'ar',
        country: '',
        language: 'ar',
        lang: 'ar',
        file: 'ar-ar.js',
        dir: 'rtl'
      }
    ],

    strategy: 'prefix_and_default',
    detectBrowserLanguage: false,
    defaultLocale: 'ar',
    lazy: true,
    langDir: 'i18n/'
  },

  compatibilityDate: '2024-11-19'
})
