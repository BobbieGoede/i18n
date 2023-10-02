import { test, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup, url, createPage } from './utils'
import { getData, getText } from './helper'

await setup({
  rootDir: fileURLToPath(new URL(`./fixtures/basic_usage`, import.meta.url)),
  browser: true,
  // prerender: true,
  // overrides
  nuxtConfig: {
    extends: [
      fileURLToPath(new URL(`./fixtures/layers/layer-lazy`, import.meta.url)),
      fileURLToPath(new URL(`./fixtures/layers/layer-vueI18n-options/layer-simple`, import.meta.url)),
      fileURLToPath(new URL(`./fixtures/layers/layer-vueI18n-options/layer-simple-secondary`, import.meta.url))
    ],
    i18n: {
      locales: ['en', 'fr'],
      defaultLocale: 'en'
    }
  }
})

test('basic usage', async () => {
  const home = url('/')
  const page = await createPage()
  await page.goto(home)

  // vue-i18n using
  expect(await getText(page, '#vue-i18n-usage p')).toEqual('Welcome')

  // URL path localizing with `useLocalePath`
  expect(await page.locator('#locale-path-usages .name a').getAttribute('href')).toEqual('/')
  expect(await page.locator('#locale-path-usages .path a').getAttribute('href')).toEqual('/')
  expect(await page.locator('#locale-path-usages .named-with-locale a').getAttribute('href')).toEqual('/fr')
  expect(await page.locator('#locale-path-usages .nest-path a').getAttribute('href')).toEqual('/user/profile')
  expect(await page.locator('#locale-path-usages .nest-named a').getAttribute('href')).toEqual('/user/profile')
  expect(await page.locator('#locale-path-usages .object-with-named a').getAttribute('href')).toEqual(
    '/category/nintendo'
  )

  // URL path localizing with `NuxtLinkLocale`
  expect(await page.locator('#nuxt-link-locale-usages .name a').getAttribute('href')).toEqual('/')
  expect(await page.locator('#nuxt-link-locale-usages .path a').getAttribute('href')).toEqual('/')
  expect(await page.locator('#nuxt-link-locale-usages .named-with-locale a').getAttribute('href')).toEqual('/fr')
  expect(await page.locator('#nuxt-link-locale-usages .nest-path a').getAttribute('href')).toEqual('/user/profile')
  expect(await page.locator('#nuxt-link-locale-usages .nest-named a').getAttribute('href')).toEqual('/user/profile')
  expect(await page.locator('#nuxt-link-locale-usages .object-with-named a').getAttribute('href')).toEqual(
    '/category/nintendo'
  )
  expect(await page.locator('#nuxt-link-locale-usages .external-url a').getAttribute('href')).toEqual(
    'https://nuxt.com/'
  )

  // Language switching path localizing with `useSwitchLocalePath`
  expect(await page.locator('#switch-locale-path-usages .switch-to-en a').getAttribute('href')).toEqual('/')
  expect(await page.locator('#switch-locale-path-usages .switch-to-fr a').getAttribute('href')).toEqual('/fr')

  // URL path with Route object with `useLocaleRoute`
  const button = await page.locator('#locale-route-usages button')
  await button.click()
  // await page.waitForURL('**/user/profile?foo=1')
  expect(await getText(page, '#profile-page')).toEqual('This is profile page')
  expect(await page.url()).include('/user/profile?foo=1')
})

test('register module hook', async () => {
  const home = url('/')
  const page = await createPage()
  await page.goto(home)

  expect(await getText(page, '#register-module')).toEqual('This is a merged module layer locale key')

  // click `fr` lang switch link
  await page.locator('.switch-to-fr a').click()
  await page.waitForURL('**/fr')

  expect(await getText(page, '#register-module')).toEqual('This is a merged module layer locale key in French')
})

test('layer provides locale `nl` and translation for key `hello`', async () => {
  const home = url('/layer-page')
  const page = await createPage()
  await page.goto(home)

  expect(await getText(page, '#i18n-layer-target')).toEqual('Hello world!')

  const homeNL = url('/nl/layer-page')
  await page.goto(homeNL)
  expect(await getText(page, '#i18n-layer-target')).toEqual('Hallo wereld!')
})

test('layer vueI18n options provides `nl` message', async () => {
  const home = url('/nl')
  const page = await createPage(undefined)
  await page.goto(home)

  expect(await getText(page, '#layer-message')).toEqual('Bedankt!')
})

test('layer vueI18n options properties are merge and override by priority', async () => {
  const home = url('/')
  const page = await createPage(undefined)
  await page.goto(home)

  expect(await getText(page, '#snake-case')).toEqual('About-this-site')
  expect(await getText(page, '#pascal-case')).toEqual('AboutThisSite')

  await page.click(`#switch-locale-path-usages .switch-to-fr a`)
  await page.waitForURL('**/fr')
  expect(await getText(page, '#snake-case')).toEqual('À-propos-de-ce-site')
  expect(await getText(page, '#pascal-case')).toEqual('ÀProposDeCeSite')
  expect(await getText(page, '#fallback-message')).toEqual('Unique translation')
})

test('load option successfully', async () => {
  const home = url('/')
  const page = await createPage()
  await page.goto(home)

  // click `fr` lang switch link
  await page.locator('#switch-locale-path-usages .switch-to-fr a').click()
  await page.waitForURL('**/fr')

  expect(await getText(page, '#home-header')).toEqual('Bonjour-le-monde!')

  // click `en` lang switch link
  await page.locator('#switch-locale-path-usages .switch-to-en a').click()
  await page.waitForURL('**/')
  expect(await getText(page, '#home-header')).toEqual('Hello-world!')
})

test('(#1740) should be loaded vue-i18n related modules', async () => {
  const home = url('/')
  const page = await createPage()
  await page.goto(home)

  expect(await getText(page, '#app-config-name')).toEqual('This is Nuxt layer')
})

test('fallback to target lang', async () => {
  const home = url('/')
  const page = await createPage()
  await page.goto(home)

  // `en` rendering
  expect(await getText(page, '#locale-path-usages .name a')).toEqual('Homepage')
  expect(await getText(page, 'title')).toEqual('Homepage')
  expect(await getText(page, '#fallback-key')).toEqual('This is the fallback message!')

  // click `nl` lang switch with `<NuxtLink>`
  await page.locator('#switch-locale-path-usages .switch-to-nl a').click()
  await page.waitForURL('**/nl')

  // fallback to en content translation
  expect(await getText(page, '#locale-path-usages .name a')).toEqual('Homepage')
  expect(await getText(page, 'title')).toEqual('Homepage')
  expect(await getText(page, '#fallback-key')).toEqual('This is the fallback message!')

  // page path
  expect(await getData(page, '#home-use-async-data')).toMatchObject({ aboutPath: '/nl/about' })

  // current locale
  expect(await getText(page, '#lang-switcher-current-locale code')).toEqual('nl')
})
