import type { Composer, ExportedGlobalComposer, VueI18n } from 'vue-i18n'
import type { ComposerCustomProperties, NuxtI18nRoutingCustomProperties } from './runtime/types'
import type { NuxtPage } from '@nuxt/schema'

declare module 'vue-i18n' {
  interface ComposerCustom extends ComposerCustomProperties {}
  interface ExportedGlobalComposer extends NuxtI18nRoutingCustomProperties {}
  interface VueI18n extends NuxtI18nRoutingCustomProperties {}
}

declare module '#app' {
  interface NuxtApp {
    $i18n: VueI18n & ExportedGlobalComposer & Composer & NuxtI18nRoutingCustomProperties & I18nRoutingCustomProperties
  }
}

declare module '@nuxt/schema' {
  interface Nuxt {
    i18n?: {
      routesUnprefixed?: NuxtPage[]
      routesDisabled?: NuxtPage[]
      routesLocalized?: NuxtPage[]
      routesLocalizedDisabled?: NuxtPage[]
    }
  }
}

export {}
