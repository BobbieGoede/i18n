import { deepCopy, isFunction, isArray, isObject, isString } from '@intlify/shared'
import { useRuntimeConfig } from '#imports'

import type { I18nOptions, Locale, FallbackLocale, LocaleMessages, DefineLocaleMessage } from 'vue-i18n'
import type { NuxtApp } from '#app'
import type { VueI18nConfig } from '../types'
import type { CoreContext } from '@intlify/h3'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LocaleLoader = { key: string; load: () => Promise<any>; cache: boolean }

const cacheMessages = new Map<string, LocaleMessages<DefineLocaleMessage>>()

export async function loadVueI18nOptions(
  vueI18nConfigs: VueI18nConfig[],
  nuxt: Pick<NuxtApp, 'runWithContext'>
): Promise<I18nOptions> {
  const vueI18nOptions: I18nOptions = { messages: {} }
  for (const configFile of vueI18nConfigs) {
    const { default: resolver } = await configFile()

    const resolved = typeof resolver === 'function' ? await nuxt.runWithContext(async () => await resolver()) : resolver

    deepCopy(resolved, vueI18nOptions)
  }

  return vueI18nOptions
}

export function makeFallbackLocaleCodes(fallback: FallbackLocale, locales: Locale[]): Locale[] {
  let fallbackLocales: string[] = []
  if (isArray(fallback)) {
    fallbackLocales = fallback
  } else if (isObject(fallback)) {
    const targets = [...locales, 'default']
    for (const locale of targets) {
      if (fallback[locale]) {
        fallbackLocales = [...fallbackLocales, ...fallback[locale].filter(Boolean)]
      }
    }
  } else if (isString(fallback) && locales.every(locale => locale !== fallback)) {
    fallbackLocales.push(fallback)
  }
  return fallbackLocales
}

export async function loadInitialMessages(
  messages: LocaleMessages<DefineLocaleMessage>,
  localeLoaders: Record<Locale, LocaleLoader[]>,
  options: { initialLocale: Locale; fallbackLocale: FallbackLocale }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const { initialLocale, fallbackLocale } = options
  const { defaultLocale, lazy, localeCodes } = useRuntimeConfig().public.i18n

  // load fallback messages
  if (lazy && fallbackLocale) {
    const fallbackLocales = makeFallbackLocaleCodes(fallbackLocale, [defaultLocale, initialLocale])
    await Promise.all(fallbackLocales.map(locale => loadAndSetLocaleMessages(locale, localeLoaders, messages)))
  }

  // load initial messages
  const locales = lazy ? [...new Set<Locale>().add(defaultLocale).add(initialLocale)] : localeCodes
  await Promise.all(locales.map((locale: Locale) => loadAndSetLocaleMessages(locale, localeLoaders, messages)))

  return messages
}

async function loadMessage(locale: Locale, { key, load }: LocaleLoader) {
  let message: LocaleMessages<DefineLocaleMessage> | null = null
  try {
    __DEBUG__ && console.log('loadMessage: (locale) -', locale)
    const getter = await load().then(r => r.default || r)
    if (isFunction(getter)) {
      message = await getter(locale)
      __DEBUG__ && console.log('loadMessage: dynamic load', message)
    } else {
      message = getter
      if (message != null && cacheMessages) {
        cacheMessages.set(key, message)
      }
      __DEBUG__ && console.log('loadMessage: load', message)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error('Failed locale loading: ' + e.message)
  }
  return message
}

export async function loadLocale(
  locale: Locale,
  localeLoaders: Record<Locale, LocaleLoader[]>,
  setter: (locale: Locale, message: LocaleMessages<DefineLocaleMessage>) => void
) {
  const loaders = localeLoaders[locale]

  if (loaders == null) {
    console.warn('Could not find messages for locale code: ' + locale)
    return
  }

  const targetMessage: LocaleMessages<DefineLocaleMessage> = {}
  for (const loader of loaders) {
    let message: LocaleMessages<DefineLocaleMessage> | undefined | null = null

    if (cacheMessages && cacheMessages.has(loader.key) && loader.cache) {
      __DEBUG__ && console.log(loader.key + ' is already loaded')
      message = cacheMessages.get(loader.key)
    } else {
      __DEBUG__ && !loader.cache && console.log(loader.key + ' bypassing cache!')
      __DEBUG__ && console.log(loader.key + ' is loading ...')
      message = await loadMessage(locale, loader)
    }

    if (message != null) {
      deepCopy(message, targetMessage)
    }
  }

  setter(locale, targetMessage)
}

type LocaleLoaderMessages = CoreContext['messages'] | LocaleMessages<DefineLocaleMessage>
export async function loadAndSetLocaleMessages(
  locale: Locale,
  localeLoaders: Record<Locale, LocaleLoader[]>,
  messages: LocaleLoaderMessages
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setter = (locale: Locale, message: Record<string, any>) => {
    // @ts-expect-error should be able to use `locale` as index
    const base = messages[locale] || {}
    deepCopy(message, base)
    // @ts-expect-error should be able to use `locale` as index
    messages[locale] = base
  }

  await loadLocale(locale, localeLoaders, setter)
}
