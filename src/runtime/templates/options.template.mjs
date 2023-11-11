// @ts-nocheck
import { defu } from 'defu'

<% options.importStrings.forEach(function (importer) { %>
<%= importer %><% }); %>

export const localeCodes = <%= JSON.stringify(options.localeCodes, null, 2) %>

export const localeMessages = { <% options.localeMessages.forEach(function ([key, val]) { %>
  "<%= key %>": [<% val.forEach(function (entry) { %>
      { key: <%= entry.key %>, load: <%= entry.load %>, cache: <%= entry.cache %> },<% }); %>
  ],<% }); %>
}

export const resolveNuxtI18nOptions = async (context) => {
  const nuxtI18nOptions = <%= JSON.stringify(options.nuxtI18nOptions, null, 2) %>
  
  const vueI18nConfigLoader = async loader => {
    const config = await loader().then(r => r.default || r)
    if (typeof config === 'object') return config
    if (typeof config === 'function') return await config()
    return {}
  }
    
  const mergeVueI18nConfigs = async (loader) => {
    const layerConfig = await vueI18nConfigLoader(loader)
    nuxtI18nOptions.vueI18n = defu(nuxtI18nOptions.vueI18n, layerConfig || {})
  }

  nuxtI18nOptions.vueI18n = { messages: {} }
  <% options.vueI18nConfigs.forEach(function (importer) { %>
  await mergeVueI18nConfigs(<%= importer %>) <% }); %>
    
  return nuxtI18nOptions
}

export const nuxtI18nOptionsDefault = <%= JSON.stringify(options.nuxtI18nOptionsDefault, null, 2) %>

export const nuxtI18nInternalOptions = <%= JSON.stringify(options.nuxtI18nInternalOptions, null, 2) %>
 
export const NUXT_I18N_MODULE_ID = "<%= options.NUXT_I18N_MODULE_ID %>"
export const parallelPlugin = <%= options.parallelPlugin %>
export const isSSG = <%= options.isSSG %>
