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

export const vueI18nConfigLoaders = [ 
  <% options.vueI18nConfigs.forEach(function (importer) { %><%= importer %>,
    <% }); %>
]

export const resolveNuxtI18nOptions = async (context) => {
  const nuxtI18nOptions = <%= JSON.stringify(options.nuxtI18nOptions, null, 2) %>
  
  // const vueI18nConfigLoader = async loader => {
  //   const config = await loader().then(r => r.default || r)
  //   if (typeof config === 'object') return config
  //   if (typeof config === 'function') return await config()
  //   return {}
  // }

  // const mergeVueI18nConfigs = async (loader) => {
  //   const layerConfig = await vueI18nConfigLoader(loader)
  //   nuxtI18nOptions.vueI18n = defu(nuxtI18nOptions.vueI18n, layerConfig || {})
  // }

  // <% options.vueI18nConfigs.forEach(function (importer) { %>
  // await mergeVueI18nConfigs(<%= importer %>) <% }); %>
  
  // nuxtI18nOptions.vueI18n = { messages: { } }
  // <% options.vueI18nConfigs.forEach(function (importer, i) { %>
  //   const { default: resolver<%=i%> } = await context.runWithContext(<%= importer %>);
  //   const resolved<%=i%> = typeof resolver<%=i%> === 'function' ? resolver<%=i%>() : resolver<%=i%>
  //   nuxtI18nOptions.vueI18n = defu(nuxtI18nOptions.vueI18n, resolved<%=i%>)
  // <% }); %>

  // for (const vLoader of vueI18nConfigLoaders) {
  //   const { default: resolver } = await vLoader()
  //   const resolved = typeof resolver === 'function' ? resolver() : resolver

  //   // console.log(resolved)
  //   // @ts-ignore
  //   nuxtI18nOptions.vueI18n = defu(nuxtI18nOptions.vueI18n, resolved)
  // }
  // console.log(nuxtI18nOptions.vueI18n)
  
  return nuxtI18nOptions
}

export const nuxtI18nOptionsDefault = <%= JSON.stringify(options.nuxtI18nOptionsDefault, null, 2) %>

export const nuxtI18nInternalOptions = <%= JSON.stringify(options.nuxtI18nInternalOptions, null, 2) %>
 
export const NUXT_I18N_MODULE_ID = "<%= options.NUXT_I18N_MODULE_ID %>"
export const parallelPlugin = <%= options.parallelPlugin %>
export const isSSG = <%= options.isSSG %>
