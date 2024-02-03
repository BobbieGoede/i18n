/* eslint-disable @typescript-eslint/no-explicit-any */
import { nuxtI18nOptions, DEFAULT_DYNAMIC_PARAMS_KEY } from '#build/i18n.options.mjs'
import { unref } from '#imports'

import { resolveByName, routeToObject } from './utils'
import { getLocale, getRouteName } from '../utils'
import { extendSwitchLocalePathIntercepter, type CommonComposableOptions } from '../../utils'

import type { Strategies, PrefixableOptions, SwitchLocalePathIntercepter } from '#build/i18n.options.mjs'
import type { Locale } from 'vue-i18n'
import type {
  RouteLocation,
  RouteLocationRaw,
  Router,
  RouteLocationNormalizedLoaded,
  RouteLocationNormalized
} from 'vue-router'

const RESOLVED_PREFIXED = new Set<Strategies>(['prefix_and_default', 'prefix_except_default'])

function prefixable(options: PrefixableOptions): boolean {
  const { currentLocale, defaultLocale, strategy } = options
  const isDefaultLocale = currentLocale === defaultLocale
  // don't prefix default locale
  return (
    !(isDefaultLocale && RESOLVED_PREFIXED.has(strategy)) &&
    // no prefix for any language
    !(strategy === 'no_prefix')
  )
}

export const DefaultPrefixable = prefixable

/**
 * Returns base name of current (if argument not provided) or passed in route.
 * 
 * @remarks
 * Base name is name of the route without locale suffix and other metadata added by nuxt i18n module

 * @param givenRoute - A route.
 * 
 * @returns The route base name. if cannot get, `undefined` is returned.
 * 
 * @public
 */
export function getRouteBaseName(givenRoute?: RouteLocation): string | undefined {
  const { routesNameSeparator } = nuxtI18nOptions
  const route = unref(givenRoute)
  if (route == null || !route.name) {
    return
  }
  const name = getRouteName(route.name)
  return name.split(routesNameSeparator)[0]
}

/**
 * Returns localized path for passed in route.
 *
 * @remarks
 * If locale is not specified, uses current locale.
 *
 * @param route - A route.
 * @param locale - A locale, optional.
 *
 * @returns A path of the current route.
 *
 * @public
 */
export function localePath(
  common: CommonComposableOptions,
  route: RouteLocationRaw,
  locale?: Locale // TODO: locale should be more type inference (completion)
): string {
  const localizedRoute = resolveRoute(common, route, locale)
  return localizedRoute == null ? '' : localizedRoute.redirectedFrom?.fullPath || localizedRoute.fullPath
}

/**
 * Returns localized route for passed in `route` parameters.
 *
 * @remarks
 * If `locale` is not specified, uses current locale.
 *
 * @param route - A route.
 * @param locale - A locale, optional.
 *
 * @returns A route. if cannot resolve, `undefined` is returned.
 *
 * @public
 */
export function localeRoute(
  common: CommonComposableOptions,
  route: RouteLocationRaw,
  locale?: Locale // TODO: locale should be more type inference (completion)
): ReturnType<Router['resolve']> | undefined {
  const resolved = resolveRoute(common, route, locale)
  return resolved ?? undefined
}

/**
 * Returns localized location for passed in route parameters.
 *
 * @remarks
 * If `locale` is not specified, uses current locale.
 *
 * @param route - A route.
 * @param locale - A locale, optional.
 *
 * @returns A route location. if cannot resolve, `undefined` is returned.
 *
 * @public
 */
export function localeLocation(
  common: CommonComposableOptions,
  route: RouteLocationRaw,
  locale?: Locale // TODO: locale should be more type inference (completion)
): Location | (RouteLocation & { href: string }) | undefined {
  const resolved = resolveRoute(common, route, locale)
  return resolved ?? undefined
}

export function resolveRoute(common: CommonComposableOptions, route: RouteLocationRaw, locale: Locale | undefined) {
  const _locale = locale || getLocale(common.i18n)
  const { strategy } = nuxtI18nOptions
  // const prefixable = extendPrefixable()
  const current = common.router.currentRoute.value
  const resolveDelocalizedRoute = (r: RouteLocationRaw) => {
    // string
    if (typeof r === 'string') {
      // name
      if (!r.startsWith('/')) {
        return common.routerUnprefixed.resolve({ name: r })
      }
      // path
      return common.routerUnprefixed.resolve(r)
    }
    // object
    else {
      if ('path' in r === false && 'name' in r === false) {
        'params' in r === false && (r.params ??= current.params)
        r.name ??= getRouteBaseName(current)
      }

      'query' in r === false && (r.query ??= current.query)
      'hash' in r === false && (r.hash ??= current.hash)
      return common.routerUnprefixed.resolve(r)
    }
  }

  try {
    const _route = resolveDelocalizedRoute(route)
    return resolveByName(common, _route, strategy, _locale)
  } catch (e: unknown) {
    // `1` is No match
    if (typeof e === 'object' && 'type' in e! && e.type === 1) {
      return null
    }
  }
}

export const DefaultSwitchLocalePathIntercepter: SwitchLocalePathIntercepter = (path: string) => path

function getLocalizableMetaFromDynamicParams(
  route: RouteLocationNormalizedLoaded
): Record<Locale, Record<string, unknown>> {
  const meta = route.meta || {}
  return (unref(meta)?.[DEFAULT_DYNAMIC_PARAMS_KEY] || {}) as Record<Locale, any>
}

/**
 * Returns path of the current route for specified locale.
 *
 * @param locale - A locale
 *
 * @returns A path of the current route.
 *
 * @public
 */
export function switchLocalePath(
  common: CommonComposableOptions,
  locale: Locale,
  _route?: RouteLocationNormalized | RouteLocationNormalizedLoaded
): string {
  const route = _route ?? common.router.currentRoute.value
  const name = getRouteBaseName(route)

  if (!name) {
    return ''
  }

  const switchLocalePathIntercepter = extendSwitchLocalePathIntercepter()
  const routeCopy = routeToObject(route)
  const resolvedParams = getLocalizableMetaFromDynamicParams(route)[locale]

  const baseRoute = { ...routeCopy, name, params: { ...routeCopy.params, ...resolvedParams } }
  const path = localePath(common, baseRoute, locale)

  // custom locale path with interceptor
  return switchLocalePathIntercepter(path, locale)
}
