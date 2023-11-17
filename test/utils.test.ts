import { parseSegment, getRoutePath, resolveLocales } from '../src/utils'
import type { LocaleObject } from 'vue-i18n-routing'

vi.mock('pathe', async () => {
  const mod = await vi.importActual<typeof import('pathe')>('pathe')
  return { ...mod, resolve: vi.fn((...args: string[]) => mod.normalize(args.join('/'))) }
})

vi.mock('@nuxt/kit', () => {
  const resolveFiles = () => {
    return [
      ['en', 'json'],
      ['ja', 'json'],
      ['es', 'json'],
      ['es-AR', 'json'],
      ['nl', 'js']
    ].map(pair => `/path/to/project/locales/${pair[0]}.${pair[1]}`)
  }
  return { resolveFiles }
})

vi.mock('node:fs')

beforeEach(async () => {
  vi.spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
    'export default defineI18nLocale(() => { return {} })'
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

test('resolveLocales', async () => {
  const locales = [
    {
      code: 'en',
      files: ['en.json']
    },
    {
      code: 'ja',
      files: ['ja.json']
    },
    {
      code: 'es',
      files: ['es.json']
    },
    {
      code: 'es-AR',
      files: ['es.json', 'es-AR.json']
    },
    {
      code: 'nl',
      files: ['nl.js']
    }
  ] as LocaleObject[]
  const resolvedLocales = await resolveLocales('/path/to/project/locales', locales, '..')
  expect(resolvedLocales).toMatchInlineSnapshot(`
    [
      {
        "code": "en",
        "files": [
          {
            "cache": true,
            "path": "en.json",
          },
        ],
        "meta": [
          {
            "file": {
              "cache": true,
              "path": "en.json",
            },
            "hash": "18f36abf",
            "key": "locale__47path_47to_47project_47locales_47en_46json",
            "loadPath": "../en.json",
            "parsed": {
              "base": "en.json",
              "dir": "/path/to/project/locales",
              "ext": ".json",
              "name": "en",
              "root": "/",
            },
            "path": "/path/to/project/locales/en.json",
            "type": "static",
          },
        ],
      },
      {
        "code": "ja",
        "files": [
          {
            "cache": true,
            "path": "ja.json",
          },
        ],
        "meta": [
          {
            "file": {
              "cache": true,
              "path": "ja.json",
            },
            "hash": "147c88eb",
            "key": "locale__47path_47to_47project_47locales_47ja_46json",
            "loadPath": "../ja.json",
            "parsed": {
              "base": "ja.json",
              "dir": "/path/to/project/locales",
              "ext": ".json",
              "name": "ja",
              "root": "/",
            },
            "path": "/path/to/project/locales/ja.json",
            "type": "static",
          },
        ],
      },
      {
        "code": "es",
        "files": [
          {
            "cache": true,
            "path": "es.json",
          },
        ],
        "meta": [
          {
            "file": {
              "cache": true,
              "path": "es.json",
            },
            "hash": "f4490d2c",
            "key": "locale__47path_47to_47project_47locales_47es_46json",
            "loadPath": "../es.json",
            "parsed": {
              "base": "es.json",
              "dir": "/path/to/project/locales",
              "ext": ".json",
              "name": "es",
              "root": "/",
            },
            "path": "/path/to/project/locales/es.json",
            "type": "static",
          },
        ],
      },
      {
        "code": "es-AR",
        "files": [
          {
            "cache": true,
            "path": "es.json",
          },
          {
            "cache": true,
            "path": "es-AR.json",
          },
        ],
        "meta": [
          {
            "file": {
              "cache": true,
              "path": "es.json",
            },
            "hash": "f4490d2c",
            "key": "locale__47path_47to_47project_47locales_47es_46json",
            "loadPath": "../es.json",
            "parsed": {
              "base": "es.json",
              "dir": "/path/to/project/locales",
              "ext": ".json",
              "name": "es",
              "root": "/",
            },
            "path": "/path/to/project/locales/es.json",
            "type": "static",
          },
          {
            "file": {
              "cache": true,
              "path": "es-AR.json",
            },
            "hash": "96ad3952",
            "key": "locale__47path_47to_47project_47locales_47es_45AR_46json",
            "loadPath": "../es-AR.json",
            "parsed": {
              "base": "es-AR.json",
              "dir": "/path/to/project/locales",
              "ext": ".json",
              "name": "es-AR",
              "root": "/",
            },
            "path": "/path/to/project/locales/es-AR.json",
            "type": "static",
          },
        ],
      },
      {
        "code": "nl",
        "files": [
          {
            "cache": false,
            "path": "nl.js",
          },
        ],
        "meta": [
          {
            "file": {
              "cache": false,
              "path": "nl.js",
            },
            "hash": "68b1a130",
            "key": "locale__47path_47to_47project_47locales_47nl_46js",
            "loadPath": "../nl.js",
            "parsed": {
              "base": "nl.js",
              "dir": "/path/to/project/locales",
              "ext": ".js",
              "name": "nl",
              "root": "/",
            },
            "path": "/path/to/project/locales/nl.js",
            "type": "dynamic",
          },
        ],
      },
    ]
  `)
})

test('parseSegment', () => {
  const tokens = parseSegment('[foo]_[bar]:[...buz]_buz_[[qux]]')
  expect(tokens).toEqual([
    { type: 1, value: 'foo' },
    { type: 0, value: '_' },
    { type: 1, value: 'bar' },
    { type: 0, value: ':' },
    { type: 3, value: 'buz' },
    { type: 0, value: '_buz_' },
    { type: 2, value: 'qux' }
  ])
})

test('getRoutePath', () => {
  const tokens = parseSegment('[foo]_[bar]:[...buz]_buz_[[qux]]')
  expect(getRoutePath(tokens)).toBe(`/:foo_:bar::buz(.*)*_buz_:qux?`)
})
