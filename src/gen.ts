/* eslint-disable @typescript-eslint/no-explicit-any */

import createDebug from 'debug'
import { isString, isArray, isObject } from '@intlify/shared'
import { generateJSON } from '@intlify/bundle-utils'
import {
  NUXT_I18N_MODULE_ID,
  NUXT_I18N_RESOURCE_PROXY_ID,
  NUXT_I18N_PRECOMPILE_ENDPOINT,
  NUXT_I18N_PRECOMPILED_LOCALE_KEY,
  NUXT_I18N_COMPOSABLE_DEFINE_LOCALE
} from './constants'
import { genDynamicImport, genObjectFromRaw } from 'knitwork'
import { parse as parsePath, normalize } from 'pathe'
import fs from 'node:fs'
// @ts-ignore
import { transform as stripType } from '@mizchi/sucrase'
import { parse as _parseCode } from '@babel/parser'
import { asVirtualId } from './transform/utils'

import type { NuxtI18nOptions, NuxtI18nInternalOptions, LocaleInfo } from './types'
import type { NuxtI18nOptionsDefault } from './constants'
import type { AdditionalMessages } from './messages'
import type { File } from '@babel/types'
import { VueI18nOptions } from 'vue-i18n'

export type LoaderOptions = {
  localeCodes?: string[]
  localeInfo?: LocaleInfo[]
  nuxtI18nOptions?: NuxtI18nOptions
  nuxtI18nOptionsDefault?: NuxtI18nOptionsDefault
  nuxtI18nInternalOptions?: NuxtI18nInternalOptions
  additionalMessages?: AdditionalMessages
}

const debug = createDebug('@nuxtjs/i18n:gen')

export function generateLoaderOptions(
  lazy: NonNullable<NuxtI18nOptions['lazy']>,
  langDir: NuxtI18nOptions['langDir'],
  localesRelativeBase: string,
  options: LoaderOptions = {},
  misc: {
    dev: boolean
    ssg: boolean
    ssr: boolean
  } = { dev: true, ssg: false, ssr: true }
) {
  const generatedImports = new Map<string, string>()
  const importMapper = new Map<string, string>()

  const convertToPairs = ({ file, files, path, paths }: LocaleInfo) => {
    const _files = file ? [file] : files || []
    const _paths = path ? [path] : paths || []
    return _files.map((f, i) => ({ file: f, path: _paths[i] }))
  }

  const buildImportKey = (root: string, dir: string, base: string) =>
    normalize(`${root ? `${root}/` : ''}${dir ? `${dir}/` : ''}${base}`)

  const localeInfo = options.localeInfo || []
  const syncLocaleFiles = new Set<LocaleInfo>()
  const asyncLocaleFiles = new Set<LocaleInfo>()

  /**
   * Prepare locale files for synthetic or asynthetic
   */
  if (langDir) {
    for (const locale of localeInfo) {
      if (!syncLocaleFiles.has(locale) && !asyncLocaleFiles.has(locale)) {
        ;(lazy ? asyncLocaleFiles : syncLocaleFiles).add(locale)
      }
    }
  }

  /**
   * Strip info for code generation
   */
  const stripPathFromLocales = (locales: any) => {
    if (isArray(locales)) {
      return locales.map(locale => {
        if (isObject(locale)) {
          const obj = { ...locale }
          delete obj.path
          delete obj.paths
          return obj
        } else {
          return locale
        }
      })
    } else {
      return locales
    }
  }

  /**
   * Generate options
   */

  const resolveNuxtI18nOptions = (value?: VueI18nOptions | string) => {
    const functionResolver = () => {
      if (isObject(value)) return `(${genObjectFromRaw(generateVueI18nOptions(value, misc.dev), '  ')})`
      if (isString(value)) return `import(${value}).then(r => (r.default || r)(context))`
      return `({})`
    }

    const vueI18nOptionsLoaderFunction = [`async context => `, functionResolver()].join('')
    const parsedLoaderPath = isString(value) ? parsePath(value) : { name: '', ext: '' }
    const loaderFilename = `${parsedLoaderPath.name}${parsedLoaderPath.ext}`
    const warning = `if (nuxtI18nOptions.vueI18n.messages) {
		console.warn("[${NUXT_I18N_MODULE_ID}]: Cannot include 'messages' option in '${loaderFilename}'. Please use Lazy-load translations.")
		nuxtI18nOptions.vueI18n.messages = {}
	  }`

    return [
      vueI18nOptionsLoaderFunction,
      '  nuxtI18nOptions.vueI18n = await vueI18nOptionsLoader(context)',
      isString(value) ? warning : ''
    ].join('\n')
  }

  /**
   * Generate meta info
   */
  const isSSG = misc.ssg
  const isSSR = misc.ssr
  const additionalMessages = generateAdditionalMessages(options.additionalMessages, misc.dev)

  const mappedSyncLocales = Array.from(syncLocaleFiles.values()).map(({ code, file, files }) => [
    code,
    (file ? [file] : files || []).map(filePath => {
      const { root, dir, base } = parsePath(filePath)
      const key = buildImportKey(root, dir, base)
      return { key: generatedImports.get(key), load: () => Promise.resolve(importMapper.get(key)) }
    })
  ])

  const mappedAsyncLocales = Array.from(asyncLocaleFiles.values()).map(localeInfo => [
    localeInfo.code,
    convertToPairs(localeInfo).map(({ file, path }) => {
      const { root, dir, base, ext } = parsePath(file)
      const key = buildImportKey(root, dir, base)
      const loadPath = resolveLocaleRelativePath(localesRelativeBase, langDir ?? '', file)
      return {
        key: `"${loadPath}"`,
        load: genDynamicImport(genImportSpecifier(loadPath, ext, path), {
          comment: `webpackChunkName: "lang_${normalizeWithUnderScore(key)}"`
        })
      }
    })
  ])

  if (options.nuxtI18nOptions?.locales) {
    options.nuxtI18nOptions.locales = stripPathFromLocales(options.nuxtI18nOptions.locales)
  }

  if (options.nuxtI18nInternalOptions?.__normalizedLocales) {
    options.nuxtI18nInternalOptions.__normalizedLocales = stripPathFromLocales(
      options.nuxtI18nInternalOptions.__normalizedLocales
    )
  }

  const localeMessages = !langDir ? {} : Object.fromEntries([...mappedSyncLocales, ...mappedAsyncLocales])

  return {
    localeMessages: genObjectFromRaw(localeMessages),
    additionalMessages: genObjectFromRaw(additionalMessages),
    vueI18nOptionsLoader: resolveNuxtI18nOptions(options.nuxtI18nOptions?.vueI18n),
    localeCodes: options.localeCodes,
    nuxtI18nOptions: options.nuxtI18nOptions,
    nuxtI18nOptionsDefault: options.nuxtI18nOptionsDefault,
    nuxtI18nInternalOptions: options.nuxtI18nInternalOptions,
    NUXT_I18N_MODULE_ID,
    NUXT_I18N_PRECOMPILE_ENDPOINT,
    NUXT_I18N_PRECOMPILED_LOCALE_KEY,
    isSSG,
    isSSR
  }
}

const TARGET_TS_EXTENSIONS = ['.ts', '.cts', '.mts']

function genImportSpecifier(id: string, ext: string, absolutePath: string) {
  if (['.js', '.cjs', '.mjs', ...TARGET_TS_EXTENSIONS].includes(ext)) {
    const code = readCode(absolutePath, ext)
    const parsed = parseCode(code, absolutePath)
    const anaylzed = scanProgram(parsed.program)
    // prettier-ignore
    return anaylzed === 'arrow-function' || anaylzed === 'function'
      ? `${asVirtualId(NUXT_I18N_RESOURCE_PROXY_ID)}?target=${id}`
      : id
  } else {
    return id
  }
}

const PARSE_CODE_CACHES = new Map<string, ReturnType<typeof _parseCode>>()

function parseCode(code: string, path: string) {
  if (PARSE_CODE_CACHES.has(path)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return PARSE_CODE_CACHES.get(path)!
  }

  const parsed = _parseCode(code, {
    allowImportExportEverywhere: true,
    sourceType: 'module'
  })

  PARSE_CODE_CACHES.set(path, parsed)
  return parsed
}

function scanProgram(program: File['program']) {
  let ret: false | 'object' | 'function' | 'arrow-function' = false
  for (const node of program.body) {
    if (node.type !== 'ExportDefaultDeclaration') continue

    if (node.declaration.type === 'ObjectExpression') {
      ret = 'object'
      break
    }

    if (
      node.declaration.type === 'CallExpression' &&
      node.declaration.callee.type === 'Identifier' &&
      node.declaration.callee.name === NUXT_I18N_COMPOSABLE_DEFINE_LOCALE
    ) {
      const [fnNode] = node.declaration.arguments
      if (fnNode.type === 'FunctionExpression') {
        ret = 'function'
        break
      }

      if (fnNode.type === 'ArrowFunctionExpression') {
        ret = 'arrow-function'
        break
      }
    }
  }

  return ret
}

export function readCode(absolutePath: string, ext: string) {
  let code = fs.readFileSync(absolutePath, 'utf-8').toString()
  if (TARGET_TS_EXTENSIONS.includes(ext)) {
    const out = stripType(code, {
      transforms: ['jsx'],
      keepUnusedImports: true
    })
    code = out.code
  }
  return code
}

const normalizeWithUnderScore = (name: string) => name.replace(/-/g, '_').replace(/\./g, '_').replace(/\//g, '_')

function resolveLocaleRelativePath(relativeBase: string, langDir: string, file: string) {
  return normalize(`${relativeBase}/${langDir}/${file}`)
}

function generateVueI18nOptions(options: VueI18nOptions, dev: boolean) {
  const env = dev ? 'development' : 'production'

  const formatMessages = (val: VueI18nOptions['messages'] = {}) => {
    const formatted: Record<string, string> = {}

    for (const [locale, messages] of Object.entries(val)) {
      formatted[locale] = generateJSON(JSON.stringify(messages), { type: 'bare', env }).code
    }

    return formatted
  }

  const generated: Record<string, string | Record<string, string>> = { messages: formatMessages(options.messages) }
  for (const [key, value] of Object.entries(options)) {
    if (key === 'messages') continue
    generated[key] = JSON.stringify(value)
  }

  return generated
}

function generateAdditionalMessages(value: AdditionalMessages = {}, dev: boolean) {
  const generated: Record<string, string[]> = {}
  for (const [locale, messages] of Object.entries(value)) {
    generated[locale] = Object.entries(messages)
      .map(([, p]) => generateJSON(JSON.stringify(p), { type: 'bare', env: dev ? 'development' : 'production' }).code)
      .map(x => `() => Promise.resolve(${x})`)
  }

  return generated
}

/* eslint-enable @typescript-eslint/no-explicit-any */
