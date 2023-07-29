import createDebug from 'debug'
import { resolve } from 'pathe'
import { isArray, isString } from '@intlify/shared'
import { NUXT_I18N_MODULE_ID } from './constants'
import { formatMessage, getProjectPath, mergeConfigLocales, resolveVueI18nConfigInfo } from './utils'

import type { Nuxt, NuxtConfigLayer } from '@nuxt/schema'
import type { LocaleObject } from 'vue-i18n-routing'
import type { NuxtI18nOptions } from './types'

const debug = createDebug('@nuxtjs/i18n:layers')

export const checkLayerOptions = (options: NuxtI18nOptions, nuxt: Nuxt) => {
  const project = nuxt.options._layers[0]
  const layers = nuxt.options._layers

  for (const layer of layers) {
    const layerI18n = getLayerI18n(layer)
    if (layerI18n == null) continue

    try {
      // check `lazy` and `langDir` option
      if (layerI18n.lazy && !layerI18n.langDir) {
        throw new Error('When using the "lazy" option you must also set the "langDir" option.')
      }

      // check `langDir` option
      if (layerI18n.langDir) {
        const locales = layerI18n.locales || []
        if (!locales.length || isString(locales[0])) {
          throw new Error('When using the "langDir" option the "locales" must be a list of objects.')
        }
        for (const locale of locales) {
          if (isString(locale) || !(locale.file || locale.files)) {
            throw new Error(
              `All locales must be objects and have the "file" or "files" property set when using "langDir".` +
                '\n' +
                `Found none in:\n${JSON.stringify(locale, null, 2)}.`
            )
          }
        }
      }
    } catch (err) {
      if (!(err instanceof Error)) throw err

      const configLocation = project.config.rootDir === layer.config.rootDir ? 'project' : 'layer'
      throw new Error(
        formatMessage(`In ${configLocation} ${resolve(project.config.rootDir, layer.config.rootDir)}. ` + err.message)
      )
    }
  }
}

export const applyLayerOptions = (options: NuxtI18nOptions, nuxt: Nuxt) => {
  const project = nuxt.options._layers[0]
  const layers = nuxt.options._layers

  // No layers to merge
  // if (layers.length === 1) return

  const resolvedLayerPaths = layers.map(l => resolve(project.config.rootDir, l.config.rootDir))
  debug('using layers at paths', resolvedLayerPaths)

  const mergedLocales = mergeLayerLocales(options, nuxt)
  debug('merged locales', mergedLocales)

  // options.locales = mergedLocales
  if (options.processedLocales == null) options.processedLocales = []
  // @ts-ignore
  options.processedLocales.push(...mergedLocales)
}

export const mergeLayerPages = (analyzer: (pathOverride: string) => void, nuxt: Nuxt) => {
  const project = nuxt.options._layers[0]
  const layers = nuxt.options._layers

  // No layers to merge
  if (layers.length === 1) return

  for (const l of layers) {
    const lPath = resolve(project.config.rootDir, l.config.rootDir, l.config.dir?.pages ?? 'pages')
    debug('mergeLayerPages: path ->', lPath)
    analyzer(lPath)
  }
}

function getLayerI18n(configLayer: NuxtConfigLayer) {
  const layerInlineOptions = (configLayer.config.modules || []).find(
    (mod): mod is [string, NuxtI18nOptions] | undefined => isArray(mod) && mod[0] === NUXT_I18N_MODULE_ID
  )?.[1]

  if (configLayer.config.i18n) {
    return { ...layerInlineOptions, ...configLayer.config.i18n }
  }

  return layerInlineOptions
}

export const mergeLayerLocales = (options: NuxtI18nOptions, nuxt: Nuxt) => {
  debug('project layer `lazy` option', options.lazy)

  /**
   * Merge locales when `lazy: false`
   */
  const mergeSimpleLocales = () => {
    if (options.locales == null) options.locales = []

    const firstI18nLayer = nuxt.options._layers.find(layer => {
      const i18n = getLayerI18n(layer)
      return i18n?.locales && i18n?.locales?.length > 0
    })
    if (firstI18nLayer == null) return []

    const localeType = typeof getLayerI18n(firstI18nLayer)?.locales?.at(0)
    const isStringLocales = (val: unknown): val is string[] => localeType === 'string'

    const mergedLocales: string[] | LocaleObject[] = []

    /*
      Layers need to be reversed to ensure that the original first layer (project)
      has the highest priority in merging (because in the reversed array it gets merged last)
    */
    const reversedLayers = [...nuxt.options._layers].reverse()
    for (const layer of reversedLayers) {
      const i18n = getLayerI18n(layer)
      debug('layer.config.i18n.locales', i18n?.locales)
      if (i18n?.locales == null) continue

      for (const locale of i18n.locales) {
        if (isStringLocales(mergedLocales)) {
          if (typeof locale !== 'string') continue
          if (mergedLocales.includes(locale)) continue

          mergedLocales.push(locale)
          continue
        }

        if (typeof locale === 'string') continue
        const localeEntry = mergedLocales.find(x => x.code === locale.code)

        if (localeEntry == null) {
          mergedLocales.push(locale)
        } else {
          Object.assign(localeEntry, locale, localeEntry)
        }
      }
    }

    return mergedLocales
  }

  const mergeLazyLocales = () => {
    const projectLangDir = getProjectPath(nuxt, nuxt.options.srcDir)
    debug('project path', getProjectPath(nuxt))

    const configs = nuxt.options._layers
      .filter(layer => {
        const i18n = getLayerI18n(layer)
        return i18n?.locales != null && i18n?.langDir != null
      })
      .map(layer => {
        const i18n = getLayerI18n(layer)
        return {
          ...i18n,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          langDir: resolve(layer.config.srcDir, i18n!.langDir!),
          projectLangDir
        }
      })

    return mergeConfigLocales(configs)
  }

  return options.lazy ? mergeLazyLocales() : mergeSimpleLocales()
}

/**
 * Returns an array of absolute paths to each layers `langDir`
 */
export const getLayerLangPaths = (nuxt: Nuxt) => {
  return nuxt.options._layers
    .filter(layer => {
      const i18n = getLayerI18n(layer)
      return i18n?.langDir != null
    })
    .map(layer => {
      const i18n = getLayerI18n(layer)
      // @ts-ignore
      return resolve(layer.config.srcDir, i18n.langDir)
    }) as string[]
}

export async function resolveLayerVueI18nConfigInfo(nuxt: Nuxt, buildDir: string) {
  if (nuxt.options._layers.length === 1) {
    return []
  }

  const layers = [...nuxt.options._layers]
  layers.shift()
  return await Promise.all(
    layers.map(layer => {
      const i18n = getLayerI18n(layer)
      return resolveVueI18nConfigInfo(i18n || {}, buildDir, layer.config.rootDir)
    })
  )
}
