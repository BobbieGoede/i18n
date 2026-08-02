import { describe, expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup, undiciRequest } from '../utils'
import { getDom } from '../helper'

await setup({
  rootDir: fileURLToPath(new URL(`../fixtures/request_config`, import.meta.url)),
})

const request = (path: string, host: string, headers: Record<string, string> = {}) =>
  undiciRequest(path, { headers: { Host: host, ...headers } })

describe('per-request config via `i18n:request-config`', () => {
  test('an untouched host serves every built locale', async () => {
    const res = await request('/', 'nuxt-app.localhost')
    expect(res.statusCode).toEqual(200)
    const dom = await getDom(await res.body.text())

    expect(await dom.locator('#locale').textContent()).toEqual('en')
    expect(await dom.locator('#locale-codes').textContent()).toEqual('en,nl,fr')
    expect(await dom.locator('#locales-list').textContent()).toEqual('en,nl,fr')
    expect(await dom.locator('#path-fr').textContent()).toEqual('/fr')
  })

  test('a narrowed host serves the narrowed locale list', async () => {
    const res = await request('/', 'restricted.nuxt-app.localhost')
    expect(res.statusCode).toEqual(200)
    const dom = await getDom(await res.body.text())

    expect(await dom.locator('#locale').textContent()).toEqual('en')
    expect(await dom.locator('#locale-codes').textContent()).toEqual('en,nl')
    expect(await dom.locator('#locales-list').textContent()).toEqual('en,nl')
    // no route to switch to - the disabled locale's routes are pruned for this request
    expect(await dom.locator('#path-fr').textContent()).toEqual('')
  })

  test('the payload carries the narrowed config to the client', async () => {
    const res = await request('/', 'restricted.nuxt-app.localhost')
    const html = await res.body.text()
    // the serialized runtime config the client hydrates from must agree with the server
    expect(html).not.toContain('fr-FR')
  })

  test('a disabled locale prefix 404s instead of serving content', async () => {
    const ok = await request('/fr', 'nuxt-app.localhost')
    expect(ok.statusCode).toEqual(200)

    const notFound = await request('/fr', 'restricted.nuxt-app.localhost')
    expect(notFound.statusCode).toEqual(404)
  })

  test('an enabled locale prefix still serves on a narrowed host', async () => {
    const res = await request('/nl', 'restricted.nuxt-app.localhost')
    expect(res.statusCode).toEqual(200)
    const dom = await getDom(await res.body.text())
    expect(await dom.locator('#locale').textContent()).toEqual('nl')
    expect(await dom.locator('#hello').textContent()).toEqual('Hallo')
  })

  test('detection does not adopt a disabled locale', async () => {
    // browser language detection redirects to the detected locale on the untouched host
    const detected = await request('/', 'nuxt-app.localhost', { 'accept-language': 'fr' })
    expect(detected.statusCode).toEqual(302)
    expect(detected.headers['location']).toContain('/fr')

    // the same header on the narrowed host stays on the default locale
    const ignored = await request('/', 'restricted.nuxt-app.localhost', { 'accept-language': 'fr' })
    expect(ignored.statusCode).toEqual(200)
  })

  test('a cookie holding a disabled locale is ignored', async () => {
    const detected = await request('/', 'nuxt-app.localhost', { cookie: 'i18n_redirected=fr' })
    expect(detected.statusCode).toEqual(302)
    expect(detected.headers['location']).toContain('/fr')

    const ignored = await request('/', 'restricted.nuxt-app.localhost', { cookie: 'i18n_redirected=fr' })
    expect(ignored.statusCode).toEqual(200)
  })
})

describe('brand domain locale clusters via `i18n:request-config`', () => {
  // one deployment hosting unrelated brands, each serving its own locale cluster (see #4101):
  // brand-x serves `en` and `fr`, brand-y serves `en` and `nl`

  test('each brand host serves only its own cluster', async () => {
    const brandX = await getDom(await (await request('/', 'brand-x.localhost')).body.text())
    expect(await brandX.locator('#locale-codes').textContent()).toEqual('en,fr')
    expect(await brandX.locator('#locales-list').textContent()).toEqual('en,fr')
    expect(await brandX.locator('#path-fr').textContent()).toEqual('/fr')
    // the other brand's locale is not switchable here
    expect(await brandX.locator('#path-nl').textContent()).toEqual('')

    const brandY = await getDom(await (await request('/', 'brand-y.localhost')).body.text())
    expect(await brandY.locator('#locale-codes').textContent()).toEqual('en,nl')
    expect(await brandY.locator('#locales-list').textContent()).toEqual('en,nl')
    expect(await brandY.locator('#path-nl').textContent()).toEqual('/nl')
    expect(await brandY.locator('#path-fr').textContent()).toEqual('')
  })

  test('a locale shared between clusters serves on both brand hosts', async () => {
    for (const host of ['brand-x.localhost', 'brand-y.localhost']) {
      const res = await request('/', host)
      expect(res.statusCode).toEqual(200)
      const dom = await getDom(await res.body.text())
      expect(await dom.locator('#locale').textContent()).toEqual('en')
    }
  })

  test('a locale outside the brand cluster 404s on that host only', async () => {
    expect((await request('/nl', 'brand-y.localhost')).statusCode).toEqual(200)
    expect((await request('/nl', 'brand-x.localhost')).statusCode).toEqual(404)

    expect((await request('/fr', 'brand-x.localhost')).statusCode).toEqual(200)
    expect((await request('/fr', 'brand-y.localhost')).statusCode).toEqual(404)
  })

  test('detection stays within the brand cluster', async () => {
    // `fr` is detectable on the brand that serves it
    const detected = await request('/', 'brand-x.localhost', { 'accept-language': 'fr' })
    expect(detected.statusCode).toEqual(302)
    expect(detected.headers['location']).toContain('/fr')

    // and inert on the brand that does not
    const ignored = await request('/', 'brand-y.localhost', { 'accept-language': 'fr' })
    expect(ignored.statusCode).toEqual(200)
  })

  test('a cookie carried across brands does not leak the other cluster', async () => {
    const detected = await request('/', 'brand-y.localhost', { cookie: 'i18n_redirected=nl' })
    expect(detected.statusCode).toEqual(302)
    expect(detected.headers['location']).toContain('/nl')

    const ignored = await request('/', 'brand-x.localhost', { cookie: 'i18n_redirected=nl' })
    expect(ignored.statusCode).toEqual(200)
  })

  test('the payload only carries the brand cluster to the client', async () => {
    const html = await (await request('/', 'brand-y.localhost')).body.text()
    expect(html).not.toContain('fr-FR')
  })
})
