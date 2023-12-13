import { resolve } from 'node:path'
import { defu } from 'defu'
import type { TestContext, TestOptions, TestRunner } from './types'

let currentContext: TestContext | undefined

export function createTestContext(options: Partial<TestOptions>): TestContext {
  const _options: Partial<TestOptions> = defu(options, {
    testDir: resolve(process.cwd(), 'test'),
    fixture: 'fixture',
    configFile: 'nuxt.config',
    setupTimeout: 120 * 1000,
    dev: !!JSON.parse(process.env.NUXT_TEST_DEV || 'false'),
    prerender: false,
    logLevel: 1,
    server: true,
    build: options.browser !== false || options.server !== false,
    nuxtConfig: {
      // modules: [
      //   //
      //   (_, nuxt) => {
      //     console.log(process.env.NODE_ENV, process.env.NODE_ENV === 'test', 'hello?', nuxt)
      //     nuxt.hook('', () => {
      //       if (process.env.NODE_ENV === 'test') {
      //         process.on('message', (msg: string) => {
      //           const parsed = JSON.parse(msg) as { type: string; value: Record<string, unknown> }
      //           console.log('child received:', typeof msg, msg, typeof parsed, parsed)
      //           if (parsed?.type === 'runtime-config') {
      //             console.log('trying to update runtimeConfig to:', defu(parsed.value, nuxt.options.runtimeConfig))
      //             nuxt.options.runtimeConfig = defu(parsed.value, nuxt.options.runtimeConfig)
      //           }
      //         })
      //       }
      //     })
      //   }
      // ]
    },
    // TODO: auto detect based on process.env
    runner: <TestRunner>'vitest',
    browserOptions: {
      type: 'chromium' as const
    }
  })

  return setTestContext({
    options: _options as TestOptions
  })
}

export function useTestContext(): TestContext {
  recoverContextFromEnv()
  if (!currentContext) {
    throw new Error('No context is available. (Forgot calling setup or createContext?)')
  }
  return currentContext
}

export function setTestContext(context: TestContext): TestContext
export function setTestContext(context?: TestContext): TestContext | undefined
export function setTestContext(context?: TestContext): TestContext | undefined {
  currentContext = context
  return currentContext
}

export function isDev() {
  const ctx = useTestContext()
  return ctx.options.dev
}

export function recoverContextFromEnv() {
  if (!currentContext && process.env.NUXT_TEST_CONTEXT) {
    setTestContext(JSON.parse(process.env.NUXT_TEST_CONTEXT || '{}'))
  }
}

export function exposeContextToEnv() {
  const { options, browser, url } = currentContext!
  process.env.NUXT_TEST_CONTEXT = JSON.stringify({ options, browser, url })
}
