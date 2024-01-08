import { generateLoaderOptions } from './gen'
import { DEFAULT_OPTIONS, NUXT_I18N_MODULE_ID } from './constants'

import type { LocaleObject } from 'vue-i18n-routing'

export type TemplateNuxtI18nOptions = {
  localeCodes: string[]
  normalizedLocales: LocaleObject[]
  dev: boolean
  isSSG: boolean
  parallelPlugin: boolean
} & ReturnType<typeof generateLoaderOptions>

export function generateTemplateNuxtI18nOptions(options: TemplateNuxtI18nOptions): string {
  return `
// @ts-nocheck
${options.importStrings.length > 0 ? options.importStrings.join('\n') + '\n' : ''}

export const localeCodes =  ${JSON.stringify(options.localeCodes, null, 2)}

export const localeLoaders = {
${options.localeLoaders
  .map(([key, val]) => {
    return `  "${key}": [${val
      .map(
        (entry: { key: string; load: string; cache: boolean }) =>
          `{ key: ${entry.key}, load: ${entry.load}, cache: ${entry.cache} }`
      )
      .join(',\n')}]`
  })
  .join(',\n')}
}

export const vueI18nConfigs = [
  ${options.vueI18nConfigs.length > 0 ? options.vueI18nConfigs.join(',\n  ') : ''}
]

export const nuxtI18nOptions = ${JSON.stringify(options.nuxtI18nOptions, null, 2)}

export const nuxtI18nOptionsDefault = ${JSON.stringify(DEFAULT_OPTIONS, null, 2)}

export const normalizedLocales = ${JSON.stringify(options.normalizedLocales, null, 2)}

export const NUXT_I18N_MODULE_ID = "${NUXT_I18N_MODULE_ID}"
export const parallelPlugin = ${options.parallelPlugin}
export const isSSG = ${options.isSSG}

`
}
