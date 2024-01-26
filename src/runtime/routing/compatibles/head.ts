import { useRouter, unref, useNuxtApp, useRuntimeConfig } from '#imports'
import { STRATEGIES } from '#build/i18n.options.mjs'

import { getComposer, getLocale, getLocales, getNormalizedLocales } from '../utils'
import { getRouteBaseName, localeRoute, switchLocalePath } from './routing'
import { isArray, isObject } from '@intlify/shared'

import type { I18nHeadMetaInfo, MetaAttrs, LocaleObject, I18nHeadOptions } from '#build/i18n.options.mjs'

/**
 * Returns localized head properties for locale-related aspects.
 *
 * @param options - An options, see about details {@link I18nHeadOptions}.
 *
 * @returns The localized {@link I18nHeadMetaInfo | head properties}.
 *
 * @public
 */
export function localeHead({
  addDirAttribute = false,
  addSeoAttributes: seoAttributes = true,
  identifierAttribute: idAttribute = 'hid'
}: I18nHeadOptions = {}): I18nHeadMetaInfo {
  const i18n = getComposer(useNuxtApp().$i18n)
  const { defaultDirection } = useRuntimeConfig().public.i18n

  const metaObject: Required<I18nHeadMetaInfo> = {
    htmlAttrs: {},
    link: [],
    meta: []
  }

  if (unref(i18n.locales) == null || unref(i18n.baseUrl) == null) {
    return metaObject
  }

  const locale = getLocale(i18n)
  const locales = getLocales(i18n)
  const currentLocale = getNormalizedLocales(locales).find(l => l.code === locale) || {
    code: locale
  }
  const currentIso = currentLocale.iso
  const currentDir = currentLocale.dir || defaultDirection

  // Adding Direction Attribute
  if (addDirAttribute) {
    metaObject.htmlAttrs.dir = currentDir
  }

  // Adding SEO Meta
  if (seoAttributes && locale && unref(i18n.locales)) {
    if (currentIso) {
      metaObject.htmlAttrs.lang = currentIso
    }

    metaObject.link.push(
      ...getHreflangLinks(unref(locales) as LocaleObject[], idAttribute),
      ...getCanonicalLink(idAttribute, seoAttributes)
    )

    metaObject.meta.push(
      ...getOgUrl(idAttribute, seoAttributes),
      ...getCurrentOgLocale(currentLocale, currentIso, idAttribute),
      ...getAlternateOgLocales(unref(locales) as LocaleObject[], currentIso, idAttribute)
    )
  }

  return metaObject
}

function getBaseUrl() {
  const i18n = getComposer(useNuxtApp().$i18n)
  return unref(i18n.baseUrl)
}

export function getHreflangLinks(
  locales: LocaleObject[],
  idAttribute: NonNullable<I18nHeadOptions['identifierAttribute']>
) {
  const baseUrl = getBaseUrl()
  const { defaultLocale, strategy } = useRuntimeConfig().public.i18n
  const links: MetaAttrs[] = []

  if (strategy === STRATEGIES.NO_PREFIX) return links

  const localeMap = new Map<string, LocaleObject>()
  for (const locale of locales) {
    const localeIso = locale.iso

    if (!localeIso) {
      console.warn('Locale ISO code is required to generate alternate link')
      continue
    }

    const [language, region] = localeIso.split('-')
    if (language && region && (locale.isCatchallLocale || !localeMap.has(language))) {
      localeMap.set(language, locale)
    }

    localeMap.set(localeIso, locale)
  }

  for (const [iso, mapLocale] of localeMap.entries()) {
    const localePath = switchLocalePath(mapLocale.code)
    if (localePath) {
      links.push({
        [idAttribute]: `i18n-alt-${iso}`,
        rel: 'alternate',
        href: toAbsoluteUrl(localePath, baseUrl),
        hreflang: iso
      })
    }
  }

  if (defaultLocale) {
    const localePath = switchLocalePath(defaultLocale)
    if (localePath) {
      links.push({
        [idAttribute]: 'i18n-xd',
        rel: 'alternate',
        href: toAbsoluteUrl(localePath, baseUrl),
        hreflang: 'x-default'
      })
    }
  }

  return links
}

export function getCanonicalUrl(baseUrl: string, seoAttributes: I18nHeadOptions['addSeoAttributes']) {
  const route = useRouter().currentRoute.value
  const currentRoute = localeRoute({ ...route, name: getRouteBaseName(route) })

  if (!currentRoute) return ''
  let href = toAbsoluteUrl(currentRoute.path, baseUrl)

  const canonicalQueries = (isObject(seoAttributes) && seoAttributes.canonicalQueries) || []
  const currentRouteQueryParams = currentRoute.query
  const params = new URLSearchParams()
  for (const queryParamName of canonicalQueries) {
    if (queryParamName in currentRouteQueryParams) {
      const queryParamValue = currentRouteQueryParams[queryParamName]

      if (isArray(queryParamValue)) {
        queryParamValue.forEach(v => params.append(queryParamName, v || ''))
      } else {
        params.append(queryParamName, queryParamValue || '')
      }
    }
  }

  const queryString = params.toString()
  if (queryString) {
    href = `${href}?${queryString}`
  }

  return href
}

export function getCanonicalLink(
  idAttribute: NonNullable<I18nHeadOptions['identifierAttribute']>,
  seoAttributes: I18nHeadOptions['addSeoAttributes']
) {
  const baseUrl = getBaseUrl()
  const href = getCanonicalUrl(baseUrl, seoAttributes)
  if (!href) return []

  return [{ [idAttribute]: 'i18n-can', rel: 'canonical', href }]
}

export function getOgUrl(
  idAttribute: NonNullable<I18nHeadOptions['identifierAttribute']>,
  seoAttributes: I18nHeadOptions['addSeoAttributes']
) {
  const baseUrl = getBaseUrl()
  const href = getCanonicalUrl(baseUrl, seoAttributes)
  if (!href) return []

  return [{ [idAttribute]: 'i18n-og-url', property: 'og:url', content: href }]
}

export function getCurrentOgLocale(
  currentLocale: LocaleObject,
  currentIso: string | undefined,
  idAttribute: NonNullable<I18nHeadOptions['identifierAttribute']>
) {
  if (!currentLocale || !currentIso) return []

  // Replace dash with underscore as defined in spec: language_TERRITORY
  return [{ [idAttribute]: 'i18n-og', property: 'og:locale', content: hypenToUnderscore(currentIso) }]
}

export function getAlternateOgLocales(
  locales: LocaleObject[],
  currentIso: string | undefined,
  idAttribute: NonNullable<I18nHeadOptions['identifierAttribute']>
) {
  const alternateLocales = locales.filter(locale => locale.iso && locale.iso !== currentIso)

  return alternateLocales.map(locale => ({
    [idAttribute]: `i18n-og-alt-${locale.iso}`,
    property: 'og:locale:alternate',
    content: hypenToUnderscore(locale.iso!)
  }))
}

function hypenToUnderscore(str: string) {
  return (str || '').replace(/-/g, '_')
}

function toAbsoluteUrl(urlOrPath: string, baseUrl: string) {
  if (urlOrPath.match(/^https?:\/\//)) return urlOrPath
  return baseUrl + urlOrPath
}
