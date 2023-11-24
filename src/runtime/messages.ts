import { deepCopy } from '@intlify/shared'

import type { I18nOptions } from 'vue-i18n'
import type { VueI18nConfig } from '../types'

export async function loadVueI18nOptions(
  vueI18nConfigs: VueI18nConfig[],
  configFn?: () => unknown,
  nuxt?: unknown
): Promise<I18nOptions> {
  const configFnBackup = globalThis.useRuntimeConfig
  if (configFn) {
    globalThis.useRuntimeConfig = configFn
  }

  const vueI18nOptions: I18nOptions = { messages: {} }
  for (const configFile of vueI18nConfigs) {
    const { default: resolver } = await configFile()

    const resolved =
      typeof resolver === 'function'
        ? nuxt != null
          ? // @ts-ignore
            nuxt.runWithContext(async () => await resolver())
          : await resolver()
        : resolver

    deepCopy(resolved, vueI18nOptions)
  }

  if (configFn) {
    globalThis.useRuntimeConfig = configFnBackup
  }

  return vueI18nOptions
}
