import { isString, assign } from '@intlify/shared'

import type {
  Strategies,
  I18nRoutingOptions,
  ComputedRouteOptions,
  LocalizeRoutesPrefixableOptions
} from 'vue-i18n-routing'
import type { NuxtPage } from '@nuxt/schema'

/** @internal */
export const STRATEGIES = {
  PREFIX: 'prefix',
  PREFIX_EXCEPT_DEFAULT: 'prefix_except_default',
  PREFIX_AND_DEFAULT: 'prefix_and_default',
  NO_PREFIX: 'no_prefix'
} as const

// NOTE:
//  we avoid SSR issue with the temp variables
//  (I think it seem to not be able to handle the MemberExpression case)
// - https://github.com/vitejs/vite/pull/6171
// - https://github.com/vitejs/vite/pull/3848
/*
export const VUE_I18N_ROUTING_DEFAULTS = {
  defaultLocale: '',
  strategy: 'prefix_except_default',
  trailingSlash: false,
  routesNameSeparator: '___',
  defaultLocaleRouteNameSuffix: 'default'
}
*/
// Language: typescript
export function adjustRoutePathForTrailingSlash(
  pagePath: string,
  trailingSlash: boolean,
  isChildWithRelativePath: boolean
) {
  return pagePath.replace(/\/+$/, '') + (trailingSlash ? '/' : '') || (isChildWithRelativePath ? '' : '/')
}

/** @internal */
export const DEFAULT_LOCALE = ''
/** @internal */
export const DEFAULT_STRATEGY = STRATEGIES.PREFIX_EXCEPT_DEFAULT
/** @internal */
export const DEFAULT_TRAILING_SLASH = false
/** @internal */
export const DEFAULT_ROUTES_NAME_SEPARATOR = '___'
/** @internal */
export const DEFAULT_LOCALE_ROUTE_NAME_SUFFIX = 'default'
/** @internal */
export const DEFAULT_DETECTION_DIRECTION = 'ltr'
/** @internal */
export const DEFAULT_BASE_URL = ''
/** @internal */
export const DEFAULT_DYNAMIC_PARAMS_KEY = ''

function prefixable(optons: LocalizeRoutesPrefixableOptions): boolean {
  const { currentLocale, defaultLocale, strategy, isChild, path } = optons

  const isDefaultLocale = currentLocale === defaultLocale
  const isChildWithRelativePath = isChild && !path.startsWith('/')

  // no need to add prefix if child's path is relative
  return (
    !isChildWithRelativePath &&
    // skip default locale if strategy is 'prefix_except_default'
    !(isDefaultLocale && strategy === 'prefix_except_default')
  )
}

export const DefaultLocalizeRoutesPrefixable = prefixable
export declare type RouteOptionsResolver = (route: NuxtPage, localeCodes: string[]) => ComputedRouteOptions | null
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
export function localizeRoutes(
  routes: NuxtPage[],
  {
    defaultLocale = DEFAULT_LOCALE,
    strategy = DEFAULT_STRATEGY as Strategies,
    trailingSlash = DEFAULT_TRAILING_SLASH,
    routesNameSeparator = DEFAULT_ROUTES_NAME_SEPARATOR,
    defaultLocaleRouteNameSuffix = DEFAULT_LOCALE_ROUTE_NAME_SUFFIX,
    includeUnprefixedFallback = false,
    optionsResolver = undefined,
    localizeRoutesPrefixable = DefaultLocalizeRoutesPrefixable,
    locales = []
  }: Pick<
    I18nRoutingOptions,
    | 'defaultLocale'
    | 'strategy'
    | 'locales'
    | 'routesNameSeparator'
    | 'trailingSlash'
    | 'defaultLocaleRouteNameSuffix'
    | 'localizeRoutesPrefixable'
  > & {
    includeUnprefixedFallback?: boolean
    optionsResolver?: RouteOptionsResolver
  } = {}
): NuxtPage[] {
  if (strategy === 'no_prefix') {
    return routes
  }

  // normalize localeCodes
  const normalizedLocaleCodes = locales.map(locale => (isString(locale) ? locale : locale.code))

  function makeLocalizedRoutes(
    route: NuxtPage,
    allowedLocaleCodes: string[],
    parent: NuxtPage | undefined = undefined,
    isExtraPageTree = false
  ): NuxtPage[] {
    // skip route localization
    // @ts-expect-error component doesn't exist on pages?
    if (route.redirect && (!route.component || !route.file)) {
      return [route]
    }

    // resolve with route (page) options
    let routeOptions: ComputedRouteOptions | null = null
    if (optionsResolver != null) {
      routeOptions = optionsResolver(route, allowedLocaleCodes)

      if (routeOptions == null) {
        return [route]
      }
    }

    // component specific options
    const componentOptions: ComputedRouteOptions = {
      locales: normalizedLocaleCodes,
      paths: {}
    }

    if (routeOptions != null) {
      assign(componentOptions, routeOptions)
    }
    assign(componentOptions, { locales: allowedLocaleCodes })

    // double check locales to remove any locales not found in pageOptions.
    // this is there to prevent children routes being localized even though they are disabled in the configuration.
    if (componentOptions.locales.length > 0 && (routeOptions?.locales?.length ?? 0) > 0) {
      componentOptions.locales = componentOptions.locales.filter(locale => routeOptions?.locales.includes(locale))
    }

    const localized: NuxtPage[] = []
    for (const locale of componentOptions.locales) {
      const { name } = route
      let { path } = route
      const localizedRoute = { ...route }

      // make localized page name
      if (name) {
        localizedRoute.name = `${name}${routesNameSeparator}${locale}`
      }

      // get custom path if any
      if (componentOptions.paths && componentOptions.paths[locale]) {
        path = componentOptions.paths[locale]
      }

      /**
       * Generate localized children routes
       * Pass custom localized path
       */
      if (route.children) {
        localizedRoute.children = route.children.flatMap(child =>
          makeLocalizedRoutes(child, [locale], { ...localizedRoute, path }, isExtraPageTree)
        )
      }

      // For 'prefix_and_default' strategy and default locale:
      // - if it's a parent page, add it with default locale suffix added (no suffix if page has children)
      // - if it's a child page of that extra parent page, append default suffix to it
      const isDefaultLocale = locale === defaultLocale
      if (isDefaultLocale && strategy === 'prefix_and_default') {
        if (parent == null) {
          const defaultRoute = { ...localizedRoute, path }

          if (name) {
            defaultRoute.name = `${localizedRoute.name}${routesNameSeparator}${defaultLocaleRouteNameSuffix}`
          }

          if (route.children) {
            // recreate child routes with default suffix added
            defaultRoute.children = route.children.flatMap(childRoute =>
              // isExtraRouteTree argument is true to indicate that this is extra route added for 'prefix_and_default' strategy
              makeLocalizedRoutes(childRoute, [locale], localizedRoute, true)
            )
          }

          localized.push(defaultRoute)
        } else if (isExtraPageTree && name) {
          localizedRoute.name += `${routesNameSeparator}${defaultLocaleRouteNameSuffix}`
        }
      }

      // add route prefix
      const shouldAddPrefix = localizeRoutesPrefixable({
        isChild: parent != null,
        path,
        currentLocale: locale,
        defaultLocale,
        strategy
      })

      /**
       * Ensure parent route paths prefix '/'
       */
      if (parent == null && !path.startsWith('/')) {
        path = `/${path}`
      }

      if (shouldAddPrefix && parent == null) {
        path = `/${locale}${path}`
      }

      /**
       * Remove parent route path from child route path
       * /en/parent/child -> child
       */
      if (parent != null) {
        path = path.replace(new RegExp(`^(/${locale})?${parent.path}/|^/`), '')
      }

      if (path) {
        const isChildWithRelativePath = parent != null && !path.startsWith('/')
        path = adjustRoutePathForTrailingSlash(path, trailingSlash, isChildWithRelativePath)
      }

      if (shouldAddPrefix && isDefaultLocale && strategy === 'prefix' && includeUnprefixedFallback) {
        localized.push({ ...route })
      }

      localizedRoute.path = path
      localized.push(localizedRoute)
    }

    return localized
  }

  const localizedRoutes = routes.flatMap(route => makeLocalizedRoutes(route, normalizedLocaleCodes))
  console.log(JSON.stringify(localizedRoutes, null, 2))
  return localizedRoutes
}
