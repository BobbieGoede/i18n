import type { Nuxt } from '@nuxt/schema'
import type { LocaleInfo, NuxtI18nOptions, VueI18nConfigPathInfo } from './types'
import { createJiti } from 'jiti'
import { addTypeTemplate, updateTemplates } from '@nuxt/kit'
import { deepCopy } from '@intlify/shared'
import { readFile } from './utils'
import { resolve } from 'pathe'

import type { I18nOptions } from 'vue-i18n'
import type { NumberFormatOptions } from '@intlify/core'

const PARSERS = {
  '.yaml': () => import('confbox/yaml').then(r => r.parseYAML),
  '.yml': () => import('confbox/yaml').then(r => r.parseYAML),
  '.json5': () => import('confbox/json5').then(r => r.parseJSON5)
} as const

export function enableVueI18nTypeGeneration(
  nuxt: Nuxt,
  _options: NuxtI18nOptions,
  localeInfo: LocaleInfo[],
  vueI18nConfigPaths: Required<VueI18nConfigPathInfo>[]
) {
  const jiti = createJiti(nuxt.options.rootDir, {
    interopDefault: true,
    moduleCache: false,
    fsCache: false,
    requireCache: false,
    extensions: ['.js', '.ts', '.mjs', '.cjs', '.mts', '.cts', '.json']
  })

  function generateInterface(obj: Record<string, unknown>, indentLevel = 1) {
    const indent = '  '.repeat(indentLevel)
    let interfaceString = ''

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          interfaceString += `${indent}${key}: {\n`
          interfaceString += generateInterface(obj[key] as Record<string, unknown>, indentLevel + 1)
          interfaceString += `${indent}};\n`
        } else {
          let propertyType = Array.isArray(obj[key]) ? 'unknown[]' : typeof obj[key]
          if (propertyType === 'function') {
            propertyType = '() => string'
          }
          interfaceString += `${indent}${key}: ${propertyType};\n`
        }
      }
    }
    return interfaceString
  }

  nuxt.options._i18n = { locales: localeInfo }

  const jsonRE = /.json5?$/
  const json5RE = /.json5$/
  const yamlRE = /.ya?ml$/

  addTypeTemplate({
    filename: 'types/i18n-messages.d.ts',
    getContents: async ({ nuxt }) => {
      const messages = {}
      const dateFormats = {}
      const numberFormats = {}

      // @ts-ignore
      globalThis.defineI18nLocale = val => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return val
      }
      // @ts-ignore
      globalThis.defineI18nConfig = val => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return val
      }
      const fetch = await import('ofetch').then(r => r.ofetch)
      globalThis.$fetch = fetch
      // @ts-ignore
      globalThis.useRuntimeConfig = () => nuxt.options.runtimeConfig

      for (const cfg of vueI18nConfigPaths) {
        const imported = await jiti.import(cfg.absolute, { try: true })
        if (typeof imported !== 'function') continue

        const res = (await imported()) as I18nOptions | undefined

        if (res == null) continue
        for (const v of Object.values(res.messages ?? [])) {
          deepCopy(v, messages)
        }

        for (const v of Object.values(res.numberFormats ?? [])) {
          deepCopy(v, numberFormats)
        }

        for (const v of Object.values(res.datetimeFormats ?? [])) {
          deepCopy(v, dateFormats)
        }
      }

      for (const l of nuxt.options._i18n?.locales ?? []) {
        for (const f of l.files) {
          const resolvedPath = resolve(nuxt.options.srcDir, f.path)
          const contents = await readFile(resolvedPath)

          // handle dynamic locale files
          if (/.(j|t)s$/.test(resolvedPath)) {
            try {
              const imported = await jiti.import(resolvedPath, { try: true })

              try {
                const transformed = jiti.transform({ source: contents, ts: true, async: true })
                const evaluated = await jiti.evalModule(transformed, { filename: resolvedPath })

                const res = (typeof evaluated === 'function' ? await evaluated() : evaluated) as unknown
                if (typeof res === 'object') {
                  deepCopy(res, messages)
                }
              } catch (_err) {
                // console.log(err)
              }

              if (typeof imported === 'function') {
                const res = (await imported(l.code)) as unknown
                if (typeof res === 'object') {
                  deepCopy(res, messages)
                }
              }
            } catch (_err: unknown) {
              // console.log(err)
            }
            continue
          }

          // handle json and json5
          if (jsonRE.test(resolvedPath)) {
            const parse = await PARSERS['.json5']()
            const parsed = json5RE.test(resolvedPath) ? parse(contents) : (JSON.parse(contents) as unknown)

            if (typeof parsed === 'object') {
              deepCopy(parsed, messages)
            }
            continue
          }

          // handle yaml
          if (yamlRE.test(resolvedPath)) {
            const contents = await readFile(resolvedPath)
            const parse = await PARSERS['.yaml']()
            const parsed = parse(contents)

            if (typeof parsed === 'object') {
              deepCopy(parsed, messages)
            }
            continue
          }
        }

        // we could only check one locale's files (serving as master/template) for speed
        // break
      }

      function getNumberFormatType(v: NumberFormatOptions) {
        if (v.style == null) return 'NumberFormatOptions'
        if (v.style === 'currency') return 'CurrencyNumberFormatOptions'
        if (v.style === 'decimal' || v.style === 'percent') return 'CurrencyNumberFormatOptions'
        return 'NumberFormatOptions'
      }

      return `// generated by @nuxtjs/i18n
interface GeneratedLocaleMessage {
  ${generateInterface(messages).trim()}
}

import type { DateTimeFormatOptions, NumberFormatOptions, SpecificNumberFormatOptions, CurrencyNumberFormatOptions } from '@intlify/core'

interface GeneratedDateTimeFormat {
  ${Object.keys(dateFormats)
    .map(k => `${k}: DateTimeFormatOptions;`)
    .join(`\n  `)}
}

interface GeneratedNumberFormat {
  ${Object.entries(numberFormats)
    .map(([k, v]) => `${k}: ${getNumberFormatType(v as NumberFormatOptions)};`)
    .join(`\n  `)}
}

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends GeneratedLocaleMessage {}
  export interface DefineDateTimeFormat extends GeneratedDateTimeFormat {}
  export interface DefineNumberFormat extends GeneratedNumberFormat {}
}

declare module '@intlify/core' {
  export interface DefineCoreLocaleMessage extends GeneratedLocaleMessage {}
}

export {}`
    }
  })

  // watch locale files for changes and update template
  nuxt.hook('builder:watch', async (_, path) => {
    const paths = nuxt.options._i18n.locales.flatMap(x => x.files.map(f => f.path))
    if (!paths.includes(path) && !vueI18nConfigPaths.some(x => x.absolute.includes(path))) return

    await updateTemplates({ filter: template => template.filename === 'types/i18n-messages.d.ts' })
  })
}
