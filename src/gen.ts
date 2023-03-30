/* eslint-disable @typescript-eslint/no-explicit-any */

import createDebug from 'debug'
import { isString, isRegExp, isFunction, isArray, isObject } from '@intlify/shared'
import { generateJSON } from '@intlify/bundle-utils'
import {
  NUXT_I18N_MODULE_ID,
  NUXT_I18N_RESOURCE_PROXY_ID,
  NUXT_I18N_PRECOMPILE_ENDPOINT,
  NUXT_I18N_PRECOMPILED_LOCALE_KEY,
  NUXT_I18N_COMPOSABLE_DEFINE_LOCALE
} from './constants'
import { genImport, genSafeVariableName, genDynamicImport, genArrayFromRaw, genObjectFromRaw } from 'knitwork'
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
import { I18nOptions, VueI18n, VueI18nOptions } from 'vue-i18n'
import { DeepRequired } from 'ts-essentials'

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

  function generateSyncImports(gen: string, absolutePath: string, relativePath?: string) {
    if (!relativePath) {
      return gen
    }

    const { root, dir, base, ext } = parsePath(relativePath)
    const key = buildImportKey(root, dir, base)
    if (!generatedImports.has(key)) {
      let loadPath = relativePath
      if (langDir) {
        loadPath = resolveLocaleRelativePath(localesRelativeBase, langDir, relativePath)
      }
      const assertFormat = ext.slice(1)
      const variableName = genSafeVariableName(`locale_${convertToImportId(key)}`)
      gen += `${genImport(
        genImportSpecifier(loadPath, ext, absolutePath),
        variableName,
        assertFormat ? { assert: { type: assertFormat } } : {}
      )}\n`
      importMapper.set(key, variableName)
      generatedImports.set(key, loadPath)
    }

    return gen
  }

  let genCode = ''
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
   * Generate locale synthetic imports
   */
  for (const localeInfo of syncLocaleFiles) {
    convertToPairs(localeInfo).forEach(({ file, path }) => {
      genCode = generateSyncImports(genCode, path, file)
    })
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
      if (isObject(value)) return `(${genObjectFromRaw(generateVueI18nOptions(value, misc.dev))})`
      if (isString(value)) return `import(${value}).then(r => (r.default || r)(context))`
      return `({})`
    }

    const vueI18nOptionsLoaderFunction = [`async context => `, functionResolver()].join('')
    const parsedLoaderPath = isString(value) ? parsePath(value) : { name: '', ext: '' }
    const loaderFilename = `${parsedLoaderPath.name}${parsedLoaderPath.ext}`
    // @ts-ignore
    //   nuxtI18nOptions.locales = stripPathFromLocales(nuxtI18nOptions.locales)
    return `
  ${vueI18nOptionsLoaderFunction}
  nuxtI18nOptions.vueI18n = await vueI18nOptionsLoader(context)
  ${
    isString(value)
      ? `if (nuxtI18nOptions.vueI18n.messages) {
    console.warn("[${NUXT_I18N_MODULE_ID}]: Cannot include 'messages' option in '${loaderFilename}'. Please use Lazy-load translations.")
    nuxtI18nOptions.vueI18n.messages = {}
  }`
      : ''
  }`
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

  const localeMessages = !langDir ? {} : Object.fromEntries([...mappedSyncLocales, ...mappedAsyncLocales])
  if (options.nuxtI18nOptions?.locales) {
    options.nuxtI18nOptions.locales = stripPathFromLocales(options.nuxtI18nOptions.locales)
  }
  debug('generate code', genCode)

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // loadMessages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localeMessages: genObjectFromRaw(localeMessages),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalMessages: genObjectFromRaw(additionalMessages),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolveNuxtI18nOptions: resolveNuxtI18nOptions(options.nuxtI18nOptions?.vueI18n),
    // : () =>
    //   Promise.resolve({}) as <Context = unknown>(context: Context) => Promise<DeepRequired<NuxtI18nOptions<Context>>>,
    // localeCodes: [] as string[],
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
    if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration.type === 'ObjectExpression') {
        ret = 'object'
        break
      } else if (
        node.declaration.type === 'CallExpression' &&
        node.declaration.callee.type === 'Identifier' &&
        node.declaration.callee.name === NUXT_I18N_COMPOSABLE_DEFINE_LOCALE
      ) {
        const [fnNode] = node.declaration.arguments
        if (fnNode.type === 'FunctionExpression') {
          ret = 'function'
          break
        } else if (fnNode.type === 'ArrowFunctionExpression') {
          ret = 'arrow-function'
          break
        }
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

const IMPORT_ID_CACHES = new Map<string, string>()

const normalizeWithUnderScore = (name: string) => name.replace(/-/g, '_').replace(/\./g, '_').replace(/\//g, '_')

function convertToImportId(file: string) {
  if (IMPORT_ID_CACHES.has(file)) {
    return IMPORT_ID_CACHES.get(file)
  }

  const { name } = parsePath(file)
  const id = normalizeWithUnderScore(name)
  IMPORT_ID_CACHES.set(file, id)

  return id
}

function resolveLocaleRelativePath(relativeBase: string, langDir: string = '', file: string = '') {
  return normalize(`${relativeBase}/${langDir}/${file}`)
}

function generateVueI18nOptions(options: Record<string, any>, dev: boolean) {
  const env = dev ? 'development' : 'production'
  const formatMessages = (val: Record<string, any>) => {
    const m: Record<string, any> = {}

    for (const [locale, messages] of Object.entries(val || {})) {
      m[locale] = `() => Promise.resolve(${
        generateJSON(JSON.stringify(messages, null, 2), { type: 'bare', env }).code
      })`
    }
    return m
  }

  const gen: Record<string, any> = {}
  //   const generated = Object.entries(options)
  //     .map(([key, value]) =>
  //       key === 'messages' ? messages: formatMessages(value) : [key]: value
  //     )
  gen.messages = formatMessages(options.messages)
  Object.entries(options).forEach(([key, value]) => {
    if (key !== 'messages') gen[key] = JSON.stringify(value)
  })
  // console.log('generated options!', gen)
  return gen
}

function generateAdditionalMessages(value: AdditionalMessages | undefined, dev: boolean) {
  const m: Record<string, any> = {}
  for (const [locale, messages] of Object.entries(value || {})) {
    m[locale] = Object.entries(messages)
      .map(([, p]) => generateJSON(JSON.stringify(p), { type: 'bare', env: dev ? 'development' : 'production' }).code)
      .map(x => `() => Promise.resolve(${x})`)

    // generateJSON(JSON.stringify(p), { type: 'bare', env: dev ? 'development' : 'production' }).code
  }
  //   const formatMessages = (val: Record<string, any>) => {
  //     return Object.entries(val)
  //       .map(([, p]) => generateJSON(JSON.stringify(p), { type: 'bare', env: dev ? 'development' : 'production' }).code)
  //       .map(x => () => Promise.resolve(x))
  //       .join(',')
  //   }

  //   const formatLocales = (val?: Record<string, any>) => {
  //     return Object.entries(val || {})
  //       .map(([locale, messages]) => `${JSON.stringify(locale)}:[${formatMessages(messages)}]`)
  //       .join(',')
  //   }

  return m
}

export function stringifyObj(obj: Record<string, any>): string {
  return `Object({${Object.entries(obj)
    .map(([key, value]) => `${JSON.stringify(key)}:${toCode(value)}`)
    .join(`,`)}})`
}

export function toCode(code: any): string {
  if (code === null) {
    return `null`
  }

  if (code === undefined) {
    return `undefined`
  }

  if (isString(code)) {
    return JSON.stringify(code)
  }

  if (isRegExp(code) && code.toString) {
    return code.toString()
  }

  if (isFunction(code) && code.toString) {
    return `(${code.toString().replace(new RegExp(`^${code.name}`), 'function ')})`
  }

  if (isArray(code)) {
    return `[${code.map(c => toCode(c)).join(`,`)}]`
  }

  if (isObject(code)) {
    return stringifyObj(code)
  }

  return code + ``
}

/* eslint-enable @typescript-eslint/no-explicit-any */
