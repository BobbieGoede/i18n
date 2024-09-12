type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : T[K]
}

declare module '#build/i18n.options.mjs' {
  type VueI18nConfig = import('./dist/types').VueI18nConfig
  type NuxtI18nOptions = import('./dist/types').NuxtI18nOptions
  type LocaleObject = import('./dist/types').LocaleObject

  /**
   * stub type definition for @nuxtjs/i18n internally
   */

  type LocaleLoader = {
    key: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    load: () => Promise<any>
    cache: boolean
  }

  export const localeLoaders: Record<string, LocaleLoader[]>

  export const vueI18nConfigs: VueI18nConfig[]

  export const localeCodes: string[]
  export const nuxtI18nOptions: DeepRequired<NuxtI18nOptions<Context>>
  export const normalizedLocales: LocaleObject[]
  export const isSSG = false
  export const parallelPlugin: boolean

  export const NUXT_I18N_MODULE_ID = ''
  export const DEFAULT_DYNAMIC_PARAMS_KEY: string
  export const DEFAULT_COOKIE_KEY: string
  export const SWITCH_LOCALE_PATH_LINK_IDENTIFIER: string
}

declare module '#internal/i18n/options.mjs' {
  type VueI18nConfig = import('./dist/types').VueI18nConfig
  type NuxtI18nOptions = import('./dist/types').NuxtI18nOptions
  type LocaleObject = import('./dist/types').LocaleObject

  /**
   * stub type definition for @nuxtjs/i18n internally
   */

  type LocaleLoader = {
    key: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    load: () => Promise<any>
    cache: boolean
  }

  export const localeLoaders: Record<string, LocaleLoader[]>

  export const vueI18nConfigs: VueI18nConfig[]

  export const localeCodes: string[]
  export const nuxtI18nOptions: DeepRequired<NuxtI18nOptions<Context>>
  export const normalizedLocales: LocaleObject[]
  export const isSSG = false
  export const parallelPlugin: boolean

  export const NUXT_I18N_MODULE_ID = ''
  export const DEFAULT_DYNAMIC_PARAMS_KEY: string
  export const DEFAULT_COOKIE_KEY: string
  export const SWITCH_LOCALE_PATH_LINK_IDENTIFIER: string
}
