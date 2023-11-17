import defu from 'defu'
import { isArray } from '@intlify/shared'
import { resolvePath } from '@nuxt/kit'
import { parse as parsePath, join, relative, resolve } from 'pathe'
import { getHash } from './gen'
import { getI18nResourceType, isExists } from './utils'
import { EXECUTABLE_EXTENSIONS, NUXT_I18N_MODULE_ID } from '../constants'

import type { Nuxt, NuxtConfigLayer } from '@nuxt/schema'
import type { NuxtI18nOptions, VueI18nConfigPathInfo } from '../types'
import { genSafeVariableName } from 'knitwork'

export const getProjectPath = (nuxt: Nuxt, ...target: string[]) => {
  const projectLayer = nuxt.options._layers[0]
  return resolve(projectLayer.config.rootDir, ...target)
}

export function getLayerI18n(configLayer: NuxtConfigLayer) {
  const layerInlineOptions = (configLayer.config.modules || []).find(
    (mod): mod is [string, NuxtI18nOptions] | undefined =>
      isArray(mod) &&
      typeof mod[0] === 'string' &&
      [NUXT_I18N_MODULE_ID, `${NUXT_I18N_MODULE_ID}-edge`].includes(mod[0])
  )?.[1]

  if (configLayer.config.i18n) {
    return defu(configLayer.config.i18n, layerInlineOptions)
  }

  return layerInlineOptions
}

export const applyOptionOverrides = (options: NuxtI18nOptions, nuxt: Nuxt) => {
  const project = nuxt.options._layers[0]
  const { overrides, ...mergedOptions } = options

  if (overrides) {
    delete options.overrides
    project.config.i18n = defu(overrides, project.config.i18n)
    Object.assign(options, defu(overrides, mergedOptions))
  }
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

export async function resolveVueI18nConfigInfo(options: NuxtI18nOptions, buildDir: string, rootDir: string) {
  const relativePath = options.vueI18n ?? 'i18n.config'
  const absolutePath = await resolvePath(relativePath, { cwd: rootDir, extensions: EXECUTABLE_EXTENSIONS })
  if (!(await isExists(absolutePath))) return undefined

  const relativeBase = relative(buildDir, rootDir)
  const parsed = parsePath(absolutePath)
  const loadPath = join(relativeBase, relative(rootDir, absolutePath))
  const hash = getHash(loadPath)
  const resourceType = getI18nResourceType(absolutePath)

  const configPathInfo: Required<VueI18nConfigPathInfo> = {
    relativeBase,
    relative: relativePath,
    absolute: absolutePath,
    rootDir,
    hash,
    type: resourceType,
    meta: {
      path: absolutePath,
      type: resourceType,
      hash,
      loadPath,
      parsed,
      key: genSafeVariableName(`${relativePath}_${hash}`)
    }
  }

  return configPathInfo
}
