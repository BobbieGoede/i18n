import { defineConfig, configDefaults } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@nuxt/test-utils': resolve('./specs/utils/index.ts')
    }
  },
  test: {
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 300000,
    retry: 1,
    server: {
      deps: {
        inline: [/@nuxt\/test-utils/]
      }
    },
    setupFiles: ['./specs/utils/setup-env.ts'],
    exclude: [...configDefaults.exclude],
    maxThreads: process.env.CI ? undefined : 4,
    minThreads: process.env.CI ? undefined : 4
  }
})
