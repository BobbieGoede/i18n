import { parse as parsePath, resolve, relative, normalize } from 'pathe'
import type { LocaleObject } from 'vue-i18n-routing'
import type { LocaleFile, LocaleInfo, NuxtI18nOptions } from '../types'
import { isString } from '@intlify/shared'
import { castArray, getI18nResourceType } from './utils'
import { getLayerI18n } from './layers'
import type { Nuxt } from '@nuxt/schema'
import { getHash } from './gen'
import { genSafeVariableName } from 'knitwork'

export const resolveRelativeLocales = (
  relativeFileResolver: (files: LocaleFile[]) => LocaleFile[],
  locale: LocaleObject | string,
  merged: LocaleObject | undefined
) => {
  if (typeof locale === 'string') return merged ?? { iso: locale, code: locale }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { file, files, ...entry } = locale

  const fileEntries = getLocaleFiles(locale)
  const relativeFiles = relativeFileResolver(fileEntries)
  const mergedLocaleObject = typeof merged === 'string' ? undefined : merged
  return {
    ...entry,
    ...mergedLocaleObject,
    // @ts-ignore
    files: [...(relativeFiles ?? []), ...((mergedLocaleObject?.files ?? []) as LocaleObject)]
  }
}

export const getLocalePaths = (locale: LocaleObject): string[] => {
  if (locale.file != null) {
    return [locale.file as unknown as LocaleFile].map(x => (typeof x === 'string' ? x : x.path))
  }

  if (locale.files != null) {
    return [...locale.files].map(x => (typeof x === 'string' ? x : x.path))
  }

  return []
}

export const getLocaleFiles = (locale: LocaleObject | LocaleInfo): LocaleFile[] => {
  if (locale.file != null) {
    return [locale.file].map(x => (typeof x === 'string' ? { path: x, cache: undefined } : x))
  }

  if (locale.files != null) {
    return [...locale.files].map(x => (typeof x === 'string' ? { path: x, cache: undefined } : x))
  }

  return []
}

export const localeFilesToRelative = (projectLangDir: string, layerLangDir: string = '', files: LocaleFile[] = []) => {
  const absoluteFiles = files.map(file => ({ path: resolve(layerLangDir, file.path), cache: file.cache }))
  const relativeFiles = absoluteFiles.map(file => ({ path: relative(projectLangDir, file.path), cache: file.cache }))

  return relativeFiles
}

export type LocaleConfig = {
  projectLangDir: string
  langDir?: string | null
  locales?: string[] | LocaleObject[]
}

/**
 * Generically merge LocaleObject locales
 *
 * @param configs prepared configs to resolve locales relative to project
 * @param baseLocales optional array of locale objects to merge configs into
 */
export const mergeConfigLocales = (configs: LocaleConfig[], baseLocales: LocaleObject[] = []) => {
  const mergedLocales = new Map<string, LocaleObject>()
  baseLocales.forEach(locale => mergedLocales.set(locale.code, locale))

  const getLocaleCode = (val: string | LocaleObject) => (typeof val === 'string' ? val : val.code)

  for (const { locales, langDir, projectLangDir } of configs) {
    if (locales == null) continue

    for (const locale of locales) {
      const code = getLocaleCode(locale)
      const filesResolver = (files: LocaleFile[]) => localeFilesToRelative(projectLangDir, langDir ?? '', files)
      const resolvedLocale = resolveRelativeLocales(filesResolver, locale, mergedLocales.get(code))
      if (resolvedLocale != null) mergedLocales.set(code, resolvedLocale)
    }
  }

  return Array.from(mergedLocales.values())
}

function normalizeIncludingLocales(locales?: string | string[]) {
  return (castArray(locales) ?? []).filter(isString)
}

export function filterLocales(options: Required<NuxtI18nOptions>, nuxt: Nuxt) {
  const project = getLayerI18n(nuxt.options._layers[0])
  const includingLocales = normalizeIncludingLocales(project?.bundle?.onlyLocales)

  if (!includingLocales.length) {
    return
  }

  options.locales = options.locales.filter(locale => {
    const code = isString(locale) ? locale : locale.code
    return includingLocales.includes(code)
  }) as string[] | LocaleObject[]
}

export function getNormalizedLocales(locales: NuxtI18nOptions['locales']): LocaleObject[] {
  locales = locales || []
  const normalized: LocaleObject[] = []
  for (const locale of locales) {
    if (isString(locale)) {
      normalized.push({ code: locale, iso: locale })
    } else {
      normalized.push(locale)
    }
  }
  return normalized
}

export async function resolveLocales(
  path: string,
  locales: LocaleObject[],
  relativeBase: string
): Promise<LocaleInfo[]> {
  const files = await Promise.all(locales.flatMap(x => getLocalePaths(x)).map(x => resolve(path, x)))

  const find = (f: string) => files.find(file => file === resolve(path, f))
  const localesResolved: LocaleInfo[] = []

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const { file, ...locale } of locales) {
    const resolved: LocaleInfo = { ...locale, files: [], meta: undefined }
    const files = getLocaleFiles(locale)

    resolved.meta = files.map(file => {
      const filePath = find(file.path) ?? ''
      const isCached = filePath ? getI18nResourceType(filePath) !== 'dynamic' : true
      const parsed = parsePath(filePath)
      const key = genSafeVariableName(`locale_${filePath}`)

      return {
        path: filePath,
        loadPath: normalize(`${relativeBase}/${file.path}`),
        type: getI18nResourceType(filePath),
        hash: getHash(filePath),
        parsed,
        key,
        file: {
          path: file.path,
          cache: file.cache ?? isCached
        }
      }
    })

    resolved.files = resolved.meta.map(meta => meta.file)

    localesResolved.push(resolved)
  }

  return localesResolved
}
