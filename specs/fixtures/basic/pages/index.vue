<script setup lang="ts">
import { watchEffect } from 'vue'
import { useAsyncData, useHead, useRouter } from '#imports'
import { useI18n, useLocalePath, useLocaleHead, useLocaleLocation, useLocaleRoute, useSwitchLocalePath } from '#i18n'
import BasicUsage from '../components/BasicUsage.vue'
import LangSwitcher from '../components/LangSwitcher.vue'

const { t } = useI18n()
const localePath = useLocalePath()
const localeLocation = useLocaleLocation()
const localeRoute = useLocaleRoute()
const switchLocalePath = useSwitchLocalePath()
const i18nHead = useLocaleHead({
  addDirAttribute: true,
  identifierAttribute: 'id',
  addSeoAttributes: { canonicalQueries: ['page'] },
  router: useRouter()
})
const { data, refresh } = useAsyncData('home', () =>
  Promise.resolve({
    aboutPath: localePath('about'),
    aboutTranslation: t('about')
  })
)

watchEffect(() => {
  refresh()
})

useHead(() => ({
  title: t('home'),
  htmlAttrs: {
    lang: i18nHead.value.htmlAttrs!.lang,
    dir: i18nHead.value.htmlAttrs!.dir
  },
  link: [...(i18nHead.value.link || [])],
  meta: [...(i18nHead.value.meta || [])]
}))
</script>

<template>
  <div>
    <h1 id="home-header">{{ $t('home') }}</h1>
    <BasicUsage />
    <LangSwitcher />
    <section>
      <strong>resolve with <code>useAsyncData</code></strong
      >:
      <code id="home-use-async-data">{{ data }}</code>
    </section>
    <section>
      <strong><code>useHead</code> with <code>useLocaleHead</code></strong
      >:
      <code id="home-use-locale-head">{{ i18nHead }}</code>
    </section>
    <section>
      <code id="extend-message">{{ t('my-module-exemple.hello') }}</code>
    </section>
    <NuxtLink id="link-about" exact :to="localePath('about')">{{ $t('about') }}</NuxtLink>
    <NuxtLink id="link-blog" :to="localePath('blog')">{{ $t('blog') }}</NuxtLink>
    <NuxtLink id="link-ignore-disable" :to="localePath('/ignore-routes/disable')"
      >go to ignoring localized disable route</NuxtLink
    >
    <NuxtLink id="link-ignore-pick" :to="localePath('/ignore-routes/pick')"
      >go to ignoring localized pick route</NuxtLink
    >
    <NuxtLink id="link-category" :to="localePath('/category/test')">go to category test</NuxtLink>
    <NuxtLink id="link-products" :to="localePath({ name: 'products-id', params: { id: 'foo' } })">
      go to product foo
    </NuxtLink>
    <NuxtLink id="link-history" :to="localePath({ name: 'history' })">go to history</NuxtLink>
    <NuxtLink id="link-define-i18n-route-false" exact :to="localePath('/define-i18n-route-false')"
      >go to defineI18nRoute(false)
    </NuxtLink>
    <section>
      <span id="issue-2020-existing">{{ localePath('/test-route?foo=bar') }}</span>
      <span id="issue-2020-nonexistent">{{ localePath('/i-dont-exist?foo=bar') }}</span>
    </section>
    <section id="locale-path">
      <span class="index">{{ localePath('/') }}</span>
      <span class="index-ja">{{ localePath('index', 'ja') }}</span>

      <!-- name -->
      <span class="about">{{ localePath('about') }}</span>

      <!-- path -->
      <span class="about-ja-path">{{ localePath('/about', 'ja') }}</span>
      <!-- <span class="not-found">{{ localePath('not-found') }}</span>
      <span class="not-found-ja">{{ localePath('not-found', 'ja') }}</span> -->
      <span class="not-found">{{ localePath('pathMatch') }}</span>
      <span class="not-found-ja">{{ localePath('pathMatch', 'ja') }}</span>

      <!-- object -->
      <span class="about-ja-name-object">{{ localePath({ name: 'about' }, 'ja') }}</span>

      <!-- omit name & path -->
      <span class="state-foo">{{ localePath({ state: { foo: 1 } }) }}</span>

      <!-- preserve query parameters -->
      <span class="query-foo">{{ localePath({ query: { foo: 1 } }) }}</span>
      <span class="query-foo-index">{{ localePath({ path: '/', query: { foo: 1 } }) }}</span>
      <span class="query-foo-name-about">{{ localePath({ name: 'about', query: { foo: 1 } }) }}</span>
      <span class="query-foo-path-about">{{ localePath({ path: '/about', query: { foo: 1 } }) }}</span>
      <span class="query-foo-string">{{ localePath('/?foo=1') }}</span>
      <span class="query-foo-string-about">{{ localePath('/about?foo=1') }}</span>
      <span class="query-foo-test-string">{{ localePath('/about?foo=1&test=2') }}</span>
      <span class="query-foo-path-param">{{ localePath('/path/as a test?foo=bar sentence') }}</span>
      <span class="query-foo-path-param-escaped">{{ localePath('/path/as%20a%20test?foo=bar%20sentence') }} </span>
      <span class="hash-path-about">{{ localePath({ path: '/about', hash: '#foo=bar' }) }}</span>

      <!-- no define path -->
      <span class="undefined-path">{{ localePath('/vue-i18n') }}</span>

      <!-- no define name -->
      <span class="undefined-name">{{ localePath('vue-i18n') }}</span>

      <!-- external -->
      <span class="external-link">{{ localePath('https://github.com') }}</span>
      <span class="external-mail">{{ localePath('mailto:example@mail.com') }}</span>
      <span class="external-phone">{{ localePath('tel:+31612345678') }}</span>
    </section>
    <ClientOnly>
      <section id="locale-route">
        <span class="index">{{ localeRoute('/') }}</span>
        <span class="index-name-ja">{{ localeRoute('index', 'ja') }}</span>
        <span class="about-name">{{ localeRoute('about') }}</span>
        <span class="about-ja">{{ localeRoute('/about', 'ja') }}</span>
        <span class="about-name-ja">{{ localeRoute('about', 'ja') }}</span>
        <span class="about-object-ja">{{ localeRoute({ name: 'about' }, 'ja') }}</span>
        <span class="path-match-ja">{{ localeRoute('/:pathMatch(.*)*', 'ja') }}</span>
        <span class="path-match-name">{{ localeRoute('pathMatch') }}</span>
        <span class="path-match-name-ja">{{ localeRoute('pathMatch', 'ja') }}</span>
        <span class="undefined-path-ja">{{ localeRoute('/vue-i18n', 'ja') }}</span>
        <span class="undefined-name-ja">{{ localeRoute('vue-i18n', 'ja') }}</span>
      </section>
    </ClientOnly>
    <ClientOnly>
      <section id="locale-location">
        <span class="index">{{ localeLocation('/') }}</span>
        <span class="index-name-ja">{{ localeLocation('index', 'ja') }}</span>
        <span class="about-name">{{ localeLocation('about') }}</span>
        <span class="about-ja">{{ localeLocation('/about', 'ja') }}</span>
        <span class="about-name-ja">{{ localeLocation('about', 'ja') }}</span>
        <span class="about-object-ja">{{ localeLocation({ name: 'about' }, 'ja') }}</span>
        <span class="path-match-ja">{{ localeLocation('/:pathMatch(.*)*', 'ja') }}</span>
        <span class="path-match-name">{{ localeLocation('pathMatch') }}</span>
        <span class="path-match-name-ja">{{ localeLocation('pathMatch', 'ja') }}</span>
        <span class="undefined-path-ja">{{ localeRoute('/vue-i18n', 'ja') }}</span>
        <span class="undefined-name-ja">{{ localeRoute('vue-i18n', 'ja') }}</span>
      </section>
    </ClientOnly>
  </div>
</template>
