import { defineNuxtModule } from '@nuxt/kit'
import { setupAlias } from './alias'
import { setupPages } from './pages'
import { setupNitro } from './nitro'
import { extendBundler } from './bundler'
import { NUXT_I18N_MODULE_ID, DEFAULT_OPTIONS } from './constants'
import type { HookResult } from '@nuxt/schema'
import type { LocaleObject, NuxtI18nOptions } from './types'
import type { Locale } from 'vue-i18n'
import { createContext } from './context'
import { prepareOptions } from './prepare/options'
import { resolveLocaleInfo } from './prepare/locale-info'
import { prepareRuntime } from './prepare/runtime'
import { prepareRuntimeConfig } from './prepare/runtime-config'
import { prepareAutoImports } from './prepare/auto-imports'
import { prepareBuildManifest } from './prepare/build-manifest'
import { prepareStrategy } from './prepare/strategy'
import { prepareLayers } from './prepare/layers'
import { prepareTranspile } from './prepare/transpile'
import { prepareVite } from './prepare/vite'

export * from './types'

export default defineNuxtModule<NuxtI18nOptions>({
  meta: {
    name: NUXT_I18N_MODULE_ID,
    configKey: 'i18n',
    compatibility: {
      nuxt: '>=3.0.0-rc.11',
      bridge: false
    }
  },
  defaults: DEFAULT_OPTIONS,
  async setup(i18nOptions, nuxt) {
    const ctx = createContext(i18nOptions, nuxt)

    /**
     * Prepare options
     */
    prepareOptions(ctx, nuxt)

    /**
     * nuxt layers handling ...
     */
    await prepareLayers(ctx, nuxt)

    /**
     * setup runtime config
     */
    // for public
    prepareRuntimeConfig(ctx, nuxt)

    /**
     * resolve locale info and vue-i18n config path
     */
    await resolveLocaleInfo(ctx, nuxt)

    /**
     * setup nuxt/pages
     */
    setupPages(ctx, nuxt)

    /**
     * ignore `/` during prerender when using prefixed routing
     */
    prepareStrategy(ctx, nuxt)

    /**
     * setup module alias
     */
    await setupAlias(ctx, nuxt)

    /**
     * add plugin and templates
     */
    prepareRuntime(ctx, nuxt)

    /**
     * disable preloading/prefetching lazy loaded locales
     */
    prepareBuildManifest(ctx, nuxt)

    /**
     * extend bundler
     */

    await extendBundler(ctx, nuxt)

    /**
     * setup nitro
     */

    await setupNitro(ctx, nuxt)

    /**
     * auto imports
     */
    await prepareAutoImports(ctx, nuxt)

    /**
     * transpile @nuxtjs/i18n
     */
    prepareTranspile(nuxt)

    /**
     * Optimize deps
     */
    prepareVite(nuxt)
  }
})

// Prevent type errors while configuring locale codes, as generated types will conflict with changes
type UserNuxtI18nOptions = Omit<NuxtI18nOptions, 'locales'> & { locales?: string[] | LocaleObject<string>[] }

// Used by nuxt/module-builder for `types.d.ts` generation
export interface ModuleOptions extends UserNuxtI18nOptions {}

export interface ModulePublicRuntimeConfig {
  i18n: {
    baseUrl: NuxtI18nOptions['baseUrl']
    rootRedirect: NuxtI18nOptions['rootRedirect']
    multiDomainLocales?: NuxtI18nOptions['multiDomainLocales']

    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    domainLocales: { [key: Locale]: { domain: string | undefined } }

    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    experimental: NonNullable<NuxtI18nOptions['experimental']>
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    locales: NonNullable<Required<NuxtI18nOptions<unknown>>['locales']>
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    differentDomains: Required<NuxtI18nOptions>['differentDomains']
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    skipSettingLocaleOnNavigate: Required<NuxtI18nOptions>['skipSettingLocaleOnNavigate']
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    defaultLocale: Required<NuxtI18nOptions>['defaultLocale']
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    lazy: Required<NuxtI18nOptions>['lazy']
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    defaultDirection: Required<NuxtI18nOptions>['defaultDirection']
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    detectBrowserLanguage: Required<NuxtI18nOptions>['detectBrowserLanguage']
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    strategy: Required<NuxtI18nOptions>['strategy']
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    routesNameSeparator: Required<NuxtI18nOptions>['routesNameSeparator']
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    defaultLocaleRouteNameSuffix: Required<NuxtI18nOptions>['defaultLocaleRouteNameSuffix']
    /**
     * Overwritten at build time, used to pass generated options to runtime
     *
     * @internal
     */
    trailingSlash: Required<NuxtI18nOptions>['trailingSlash']
  }
}
export interface ModuleHooks {
  'i18n:registerModule': (
    registerModule: (config: Pick<NuxtI18nOptions<unknown>, 'langDir' | 'locales'>) => void
  ) => HookResult
}

export interface ModuleRuntimeHooks {
  // NOTE: To make type inference work the function signature returns `HookResult`
  // Should return `string | void`
  'i18n:beforeLocaleSwitch': <Context = unknown>(params: {
    oldLocale: Locale
    newLocale: Locale
    initialSetup: boolean
    context: Context
  }) => HookResult

  'i18n:localeSwitched': (params: { oldLocale: Locale; newLocale: Locale }) => HookResult
}

// Used by module for type inference in source code
declare module '#app' {
  interface RuntimeNuxtHooks extends ModuleRuntimeHooks {}
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    ['i18n']?: Partial<UserNuxtI18nOptions>
  }
  interface NuxtOptions {
    ['i18n']: UserNuxtI18nOptions
  }
  interface NuxtHooks extends ModuleHooks {}
  interface PublicRuntimeConfig extends ModulePublicRuntimeConfig {}
}
