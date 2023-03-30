<%= options.importStrings %>

export const localeCodes = <%= JSON.stringify(options.localeCodes, null, 2) %>

export const localeMessages = <%= options.localeMessages %>

export const additionalMessages = <%= options.additionalMessages %>

export const resolveNuxtI18nOptions = async (context) => {
  const nuxtI18nOptions = <%= JSON.stringify(options.nuxtI18nOptions, null, 2) %>
  
  const vueI18nOptionsLoader = <%= options.vueI18nOptionsLoader %>

  return nuxtI18nOptions
}

export const nuxtI18nOptionsDefault = <%= JSON.stringify(options.nuxtI18nOptionsDefault, null, 2) %>

export const nuxtI18nInternalOptions = <%= JSON.stringify(options.nuxtI18nInternalOptions, null, 2) %>
export const NUXT_I18N_MODULE_ID = <%= JSON.stringify(options.NUXT_I18N_MODULE_ID) %>
export const NUXT_I18N_PRECOMPILE_ENDPOINT = <%= JSON.stringify(options.NUXT_I18N_PRECOMPILE_ENDPOINT) %>
export const NUXT_I18N_PRECOMPILED_LOCALE_KEY = <%= JSON.stringify(options.NUXT_I18N_PRECOMPILED_LOCALE_KEY) %>
export const isSSG = <%= JSON.stringify(options.isSSG) %>
export const isSSR = <%= JSON.stringify(options.isSSR) %>
