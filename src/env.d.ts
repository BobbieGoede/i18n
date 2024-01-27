declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production'
  }
}

declare let __DEBUG__: boolean
declare let __NUXT_I18N_MODULE_ID__: string
declare let __NUXT_I18N_PLUGIN_PARALLEL__: boolean
