import { fileURLToPath } from 'node:url'
import { describe, it } from 'vitest'
import { STRATEGIES } from '../../src/constants'
import { setup } from '../utils'
import { localePathTests } from './routing-tests'

await setup({
  rootDir: fileURLToPath(new URL(`../fixtures/basic`, import.meta.url)),
  browser: true,
  // overrides
  nuxtConfig: {
    extends: [fileURLToPath(new URL(`../fixtures/helpers/layer-path-match-page`, import.meta.url))],
    i18n: {
      strategy: STRATEGIES.PREFIX_AND_DEFAULT,
      locales: ['en', 'ja'],
      defaultLocale: ''
    }
  }
})

describe('localePath', async () => {
  describe(`route strategy: ${STRATEGIES.PREFIX_AND_DEFAULT}`, async () => {
    it('should be worked', async () => {
      await localePathTests(STRATEGIES.PREFIX_AND_DEFAULT)
    })
  })
})
