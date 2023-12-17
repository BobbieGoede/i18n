import { getNormalizedLocales } from './utils'

import type { Locale } from 'vue-i18n'
import type { NuxtPage } from '@nuxt/schema'
import type { MarkRequired, MarkOptional } from 'ts-essentials'
import type { NuxtI18nOptions } from './types'

const join = (...args: (string | undefined)[]) => args.filter(Boolean).join('')

/**
 * Options to compute route localizing
 *
 * @remarks
 * The route options that is compute the route to be localized on {@link localizeRoutes}
 *
 * @public
 */
export declare interface ComputedRouteOptions {
  locales: readonly string[]
  paths: Record<string, string>
}

/**
 * Resolver for route localizing options
 *
 * @public
 */
export declare type RouteOptionsResolver = (route: NuxtPage, localeCodes: string[]) => ComputedRouteOptions | undefined

/**
 * Localize route path prefix judgment options used in {@link LocalizeRoutesPrefixable}
 *
 * @public
 */
export interface LocalizeRoutesPrefixableOptions {
  /**
   * Current locale
   */
  locale: Locale
  /**
   * Default locale
   */
  defaultLocale?: Locale | undefined
  /**
   * The parent route of the route to be resolved
   */
  parent: NuxtPage | undefined
  /**
   * The path of route
   */
  path: string
}
function localizeRoutesPrefixable(
  localizeOptions: LocalizeRoutesPrefixableOptions,
  options: LocalizeRoutesParams
): boolean {
  const isDefaultLocale = localizeOptions.locale === (options.defaultLocale ?? '')
  const isChildWithRelativePath = localizeOptions.parent != null && !localizeOptions.path.startsWith('/')

  // no need to add prefix if child's path is relative
  return (
    !options.differentDomains &&
    !isChildWithRelativePath &&
    // skip default locale if strategy is 'prefix_except_default'
    !(isDefaultLocale && options.strategy === 'prefix_except_default')
  )
}

function adjustRoutePathForTrailingSlash(pagePath: string, trailingSlash: boolean, parent?: NuxtPage) {
  const isChildWithRelativePath = parent != null && !pagePath.startsWith('/')
  return pagePath.replace(/\/+$/, '') + (trailingSlash ? '/' : '') || (isChildWithRelativePath ? '' : '/')
}

export type LocalizeRoutesParams = MarkRequired<
  NuxtI18nOptions,
  'strategy' | 'locales' | 'routesNameSeparator' | 'trailingSlash' | 'defaultLocaleRouteNameSuffix'
> & {
  includeUnprefixedFallback?: boolean
  optionsResolver?: RouteOptionsResolver
}

type LocalizedRoute = NuxtPage & { locale: Locale; parent: NuxtPage | undefined }
type LocalizeRouteParams = { localeCodes: string[]; parent?: NuxtPage; extraTree?: boolean }
/**
 * Localize routes
 *
 * @param routes - Some routes
 * @param options - An options
 *
 * @returns Localized routes
 *
 * @public
 */
export function localizeRoutes(routes: NuxtPage[], options: LocalizeRoutesParams): NuxtPage[] {
  if (options.strategy === 'no_prefix') {
    return routes
  }

  // normalize localeCodes
  const _localeCodes = getNormalizedLocales(options.locales).map(x => x.code)

  function localizeRoute(
    route: NuxtPage,
    { localeCodes = [], parent, extraTree = false }: LocalizeRouteParams
  ): NuxtPage[] {
    // skip route localization
    if (route.redirect && !route.file) {
      return [route]
    }

    // resolve with route (page) options
    const routeOptions = options.optionsResolver?.(route, localeCodes)
    if (options.optionsResolver != null && routeOptions == null) {
      return [route]
    }

    // component specific options
    const componentOptions: ComputedRouteOptions = {
      locales: localeCodes,
      paths: {},
      ...routeOptions
    }

    // double check locales to remove any locales not found in pageOptions.
    // this is there to prevent children routes being localized even though they are disabled in the configuration.
    if ((routeOptions?.locales.length ?? 0) > 0) {
      componentOptions.locales = componentOptions.locales.filter(locale => routeOptions?.locales.includes(locale))
    }

    const localizedRoutes: LocalizedRoute[] = []
    for (const locale of componentOptions.locales) {
      const isDefaultLocale = locale === options.defaultLocale
      const localized: LocalizedRoute = { ...route, locale, parent }

      // localize name if set
      localized.name &&= join(localized.name, options.routesNameSeparator, locale)

      // localize child routes if set
      localized.children &&= localized.children.flatMap(child =>
        localizeRoute(child, { localeCodes: [locale], parent: route, extraTree })
      )

      // use custom path if found
      localized.path = componentOptions.paths?.[locale] ?? localized.path

      // For 'prefix_and_default' strategy and default locale:
      // - if it's a parent page, add it with default locale suffix added (no suffix if page has children)
      // - if it's a child page of that extra parent page, append default suffix to it
      if (isDefaultLocale && options.strategy === 'prefix_and_default') {
        if (parent == null) {
          const defaultRoute = { ...localized }
          defaultRoute.name &&= join(
            defaultRoute.name,
            options.routesNameSeparator,
            options.defaultLocaleRouteNameSuffix
          )

          // recreate child routes with default suffix added
          defaultRoute.children &&= defaultRoute.children.flatMap(childRoute =>
            // extraTree argument is true to indicate that this is extra route added for 'prefix_and_default' strategy
            localizeRoute(childRoute, {
              localeCodes: [localized.locale],
              parent: localized.parent,
              extraTree: true
            })
          )
          localizedRoutes.push(defaultRoute)
        } else if (extraTree) {
          localized.name &&= join(localized.name, options.routesNameSeparator, options.defaultLocaleRouteNameSuffix)
        }
      }

      // add route prefix
      const shouldAddPrefix = localizeRoutesPrefixable(localized, options)
      if (shouldAddPrefix) {
        localized.path = join('/', locale, localized.path)

        if (isDefaultLocale && options.strategy === 'prefix' && options.includeUnprefixedFallback) {
          localizedRoutes.push({ ...route, locale, parent })
        }
      }

      localized.path &&= adjustRoutePathForTrailingSlash(localized.path, options.trailingSlash, parent)
      localizedRoutes.push(localized)
    }

    return localizedRoutes.flatMap((x: MarkOptional<LocalizedRoute, 'parent' | 'locale'>) => {
      delete x.parent
      delete x.locale
      return x
    })
  }

  return routes.flatMap(route => localizeRoute(route, { localeCodes: _localeCodes }))
}
