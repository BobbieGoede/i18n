import { defineNitroPlugin } from 'nitropack/runtime'
import { getRequestURL } from 'h3'

/**
 * Narrows the locales served to the request:
 * - hosts under `restricted.` do not serve `fr`
 * - brand hosts serve only their own locale cluster: one deployment hosting unrelated
 *   brands, each with its own set of locales (the #4101 use case)
 */
const brandClusters: Record<string, string[]> = {
  'brand-x.localhost': ['en', 'fr'],
  'brand-y.localhost': ['en', 'nl'],
}

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('i18n:request-config', (event, config) => {
    const host = getRequestURL(event, { xForwardedHost: true }).host
    const cluster = brandClusters[host]
    if (cluster) {
      config.locales = (config.locales as { code: string }[]).filter(l => cluster.includes(l.code)) as typeof config.locales
    }
    if (host.startsWith('restricted.')) {
      config.locales = (config.locales as { code: string }[]).filter(l => l.code !== 'fr') as typeof config.locales
    }
  })
})
