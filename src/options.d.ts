// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { LocaleObject, NuxtI18nOptions, VueI18nConfig } from './types'

export type * from './types'

/**
 * stub type definition for @nuxtjs/i18n internally
 */

type LocaleLoader = {
  key: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load: () => Promise<any>
  cache: boolean
}

export const localeLoaders: Record<string, LocaleLoader[]> = {}

export const vueI18nConfigs: VueI18nConfig[]

export { NuxtI18nOptions, DetectBrowserLanguageOptions, RootRedirectOptions } from './types'
