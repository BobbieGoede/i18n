/* eslint-disable @typescript-eslint/no-explicit-any */

import createDebug from 'debug'
import { EXECUTABLE_EXTENSIONS } from './constants'
import { genImport, genDynamicImport } from 'knitwork'
import { withQuery } from 'ufo'
import { PrerenderTarget, toCode } from './utils'

import type { LocaleInfo, VueI18nConfigPathInfo, FileMeta } from './types'

export type LoaderOptions = {
  vueI18nConfigPaths: Required<VueI18nConfigPathInfo>[]
  localeInfo: LocaleInfo[]
  lazy: boolean
}

const debug = createDebug('@nuxtjs/i18n:gen')

export function generateLoaderOptions({ lazy, vueI18nConfigPaths, localeInfo }: LoaderOptions) {
  debug('generateLoaderOptions: lazy', lazy)

  /**
   * Reverse order so project overwrites layers
   */
  const vueI18nConfigs = vueI18nConfigPaths
    .reverse()
    .filter(config => config.absolute !== '')
    .map(({ meta }) => {
      const importSpecifier = genImportSpecifier(meta, 'config', { hash: meta.hash, config: '1' })
      return genDynamicImport(importSpecifier, { comment: `webpackChunkName: "${meta.key}"` })
    })

  const localeMessages = localeInfo.map(locale => {
    const messages = locale.meta?.map(meta => {
      const message = {
        key: toCode(meta.loadPath),
        cache: toCode(meta?.file?.cache ?? true),
        load: `() => Promise.resolve(${meta.key})`
      }

      if (lazy) {
        const importSpecifier = genImportSpecifier(meta, 'locale', { locale: locale.code, hash: meta.hash })
        message.load = genDynamicImport(importSpecifier, { comment: `webpackChunkName: "${meta.key}"` })
      }

      return message
    })

    return [locale.code, messages]
  })

  const importStrings = (lazy ? [] : localeInfo).flatMap(
    locale =>
      locale.meta?.map(meta => {
        const importSpecifier = genImportSpecifier(meta, 'locale', { locale: locale.code, hash: meta.hash })
        return genImport(importSpecifier, meta.key, { assert: { type: meta.parsed.ext.slice(1) } })
      })
  )

  const generated = {
    importStrings: [...new Set(importStrings)],
    localeMessages,
    vueI18nConfigs
  }

  debug('generate code', generated)

  return generated
}

function genImportSpecifier(
  { loadPath, path, parsed, type }: Pick<FileMeta, 'loadPath' | 'path' | 'parsed' | 'type'>,
  resourceType: PrerenderTarget['type'] | undefined,
  query: Record<string, string> = {}
) {
  if (!EXECUTABLE_EXTENSIONS.includes(parsed.ext)) return loadPath

  if (resourceType != null && type === 'unknown') {
    throw new Error(`'unknown' type in '${path}'.`)
  }

  if (resourceType === 'locale') {
    return withQuery(loadPath, type === 'dynamic' ? query : {})
  }

  if (resourceType === 'config') {
    return withQuery(loadPath, query)
  }

  return loadPath
}

/* eslint-enable @typescript-eslint/no-explicit-any */
