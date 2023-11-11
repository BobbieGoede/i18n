// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { NuxtI18nOptions, NuxtI18nInternalOptions, RootRedirectOptions } from './types'
import type { NuxtI18nOptionsDefault } from './constants'
import type { DeepRequired } from 'ts-essentials'
import type { Nuxt } from '@nuxt/schema'

/**
 * stub type definition for @nuxtjs/i18n internally
 */

type LocaleLoader = {
  key: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load: () => Promise<any>
  cache: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loadMessages: () => Promise<any> = () => Promise.resolve({})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const localeMessages: Record<string, LocaleLoader[]> = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resolveNuxtI18nOptions: <Context = Nuxt>(
  context: Context
) => Promise<DeepRequired<NuxtI18nOptions<Context>>> = () => Promise.resolve({})
export type LoaderResult = Record<string, unknown> | (() => Record<string, unknown>)
type LoadedConfig = Record<string, unknown>
export type VLoaderType = () => Promise<{ default: LoadedConfig | (() => LoadedConfig) }>
export const vueI18nConfigLoaders: VLoaderType[]
export const localeCodes: string[] = []
export const nuxtI18nOptions: DeepRequired<NuxtI18nOptions> = {}
export const nuxtI18nOptionsDefault: NuxtI18nOptionsDefault = {}
export const nuxtI18nInternalOptions: DeepRequired<NuxtI18nInternalOptions> = {}
export const NUXT_I18N_MODULE_ID = ''
export const isSSG = false
export const parallelPlugin: boolean

export {
  NuxtI18nOptions,
  NuxtI18nOptionsDefault,
  NuxtI18nInternalOptions,
  DetectBrowserLanguageOptions,
  RootRedirectOptions
} from './types'
