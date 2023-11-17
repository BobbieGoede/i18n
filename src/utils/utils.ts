import { promises as fs, readFileSync as _readFileSync, constants as FS_CONSTANTS } from 'node:fs'
import { parse as _parseCode } from '@babel/parser'
import { parse as parsePath } from 'pathe'
import { transform } from 'sucrase'
import { EXECUTABLE_EXTENSIONS, NUXT_I18N_MODULE_ID, TS_EXTENSIONS } from '../constants'

import type { File } from '@babel/types'
import type { I18nResourceType } from '../types'

export function formatMessage(message: string) {
  return `[${NUXT_I18N_MODULE_ID}]: ${message}`
}

export function castArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export async function isExists(path: string) {
  try {
    await fs.access(path, FS_CONSTANTS.F_OK)
    return true
  } catch (e) {
    return false
  }
}

export function readFileSync(path: string) {
  return _readFileSync(path, { encoding: 'utf-8' })
}

export function readCode(absolutePath: string, ext: string) {
  let code = readFileSync(absolutePath)

  if (TS_EXTENSIONS.includes(ext)) {
    const out = transform(code, {
      transforms: ['typescript', 'jsx'],
      keepUnusedImports: true
    })

    code = out.code
  }

  return code
}

function scanProgram(program: File['program'] /*, calleeName: string*/) {
  let ret: false | 'object' | 'function' | 'arrow-function' = false
  for (const node of program.body) {
    if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration.type === 'ObjectExpression') {
        ret = 'object'
        break
      } else if (
        node.declaration.type === 'CallExpression' &&
        node.declaration.callee.type === 'Identifier' // &&
        // node.declaration.callee.name === calleeName
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

const PARSE_CODE_CACHES = new Map<string, ReturnType<typeof _parseCode>>()

function parseCode(code: string, path: string) {
  if (PARSE_CODE_CACHES.has(path)) {
    return PARSE_CODE_CACHES.get(path)!
  }

  const parsed = _parseCode(code, {
    allowImportExportEverywhere: true,
    sourceType: 'module'
  })

  PARSE_CODE_CACHES.set(path, parsed)
  return parsed
}

export function getI18nResourceType(path: string): I18nResourceType {
  const ext = parsePath(path).ext
  if (EXECUTABLE_EXTENSIONS.includes(ext)) {
    const code = readCode(path, ext)
    const parsed = parseCode(code, path)
    const analyzed = scanProgram(parsed.program)
    if (analyzed === 'object') {
      return 'static'
    } else if (analyzed === 'function' || analyzed === 'arrow-function') {
      return 'dynamic'
    } else {
      return 'unknown'
    }
  } else {
    return 'static'
  }
}
