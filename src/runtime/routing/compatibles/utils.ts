import type { Locale } from 'vue-i18n'
import type { RouteLocation, RouteLocationNormalizedLoaded } from 'vue-router'
import { nuxtI18nOptions, type Strategies } from '#build/i18n.options.mjs'
import type { CommonComposableOptions } from '../../utils'
import { getLocaleRouteName } from '../utils'

/**
 * NOTE:
 * Nuxt route uses a proxy with getters for performance reasons (https://github.com/nuxt/nuxt/pull/21957).
 * Spreading will result in an empty object, so we make a copy of the route by accessing each getter property by name.
 */
export function routeToObject(route: RouteLocationNormalizedLoaded) {
  const { fullPath, query, hash, name, path, params, meta, redirectedFrom, matched } = route
  return {
    fullPath,
    params,
    query,
    hash,
    name,
    path,
    meta,
    matched,
    redirectedFrom
  }
}

export function resolveByName(
  common: CommonComposableOptions,
  route: RouteLocation & { href: string },
  strategy: Strategies,
  locale: Locale
) {
  if (route.name == null) {
    return route
  }

  const localizedName = getLocaleRouteName(route.name, locale, nuxtI18nOptions)
  const localizedExists = common.router.hasRoute(localizedName)
  const localizedRouteDisabled = common.routerDisabled.hasRoute(localizedName)
  const localizationDisabledForRoute = common.routerDisabled.hasRoute(route.name)

  const resolveLocalized = strategy !== 'no_prefix' && !localizationDisabledForRoute
  // console.log({
  //   localizedName,
  //   localizedExists,
  //   localizedRouteDisabled,
  //   localizationDisabledForRoute,
  //   resolveLocalized,
  //   strategy
  // })
  if (localizedRouteDisabled || (resolveLocalized && !localizedExists && localizationDisabledForRoute)) {
    return null
  }

  const localized = common.router.resolve({
    name: resolveLocalized ? localizedName : route.name,
    query: route.query,
    params: route.params,
    hash: route.hash
  })

  return localized
}
