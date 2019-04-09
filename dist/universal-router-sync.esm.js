import pathToRegexp from 'path-to-regexp';

/**
 * Universal Router (https://www.kriasoft.com/universal-router/)
 *
 * Copyright (c) 2015-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
function isChildRoute(parentRoute, childRoute) {
    if (parentRoute === null)
        return false;
    let route = childRoute;
    while (route) {
        route = route.parent;
        if (route === parentRoute) {
            return true;
        }
    }
    return false;
}

/**
 * Universal Router (https://www.kriasoft.com/universal-router/)
 *
 * Copyright (c) 2015-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
const { hasOwnProperty } = Object.prototype;
const cache = new Map();
function decodeParam(val) {
    try {
        return decodeURIComponent(val);
    }
    catch (err) {
        return val;
    }
}
function matchPath(route, pathname, parentKeys, parentParams) {
    const end = !route.children;
    const cacheKey = `${route.path || ''}|${end}`;
    let regexp = cache.get(cacheKey);
    if (!regexp) {
        const keys = [];
        regexp = {
            keys,
            pattern: pathToRegexp(route.path || '', keys, { end }),
        };
        cache.set(cacheKey, regexp);
    }
    const m = regexp.pattern.exec(pathname);
    if (!m) {
        return null;
    }
    const path = m[0];
    const params = { ...parentParams };
    for (let i = 1; i < m.length; i++) {
        const key = regexp.keys[i - 1];
        const prop = key.name;
        const value = m[i];
        if (value !== undefined || !hasOwnProperty.call(params, prop)) {
            if (key.repeat) {
                params[prop] = value ? value.split(key.delimiter).map(decodeParam) : [];
            }
            else {
                params[prop] = value ? decodeParam(value) : value;
            }
        }
    }
    return {
        path: !end && path.charAt(path.length - 1) === '/' ? path.substr(1) : path,
        keys: parentKeys.concat(regexp.keys),
        params,
    };
}

/**
 * Universal Router (https://www.kriasoft.com/universal-router/)
 *
 * Copyright (c) 2015-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
function matchRoute(route, baseUrl, pathname, parentKeys, parentParams) {
    let match = null;
    let childMatches;
    let childIndex = 0;
    return {
        next(routeToSkip) {
            if (route === routeToSkip) {
                return { done: true, value: undefined };
            }
            if (!match) {
                match = matchPath(route, pathname, parentKeys, parentParams);
                if (match) {
                    return {
                        done: false,
                        value: {
                            route,
                            baseUrl,
                            path: match.path,
                            keys: match.keys,
                            params: match.params,
                        },
                    };
                }
            }
            if (match && route.children) {
                while (childIndex < route.children.length) {
                    if (!childMatches) {
                        const childRoute = route.children[childIndex];
                        childRoute.parent = route;
                        childMatches = matchRoute(childRoute, baseUrl + match.path, pathname.substr(match.path.length), match.keys, match.params);
                    }
                    const childMatch = childMatches.next(routeToSkip);
                    if (!childMatch.done) {
                        return {
                            done: false,
                            value: childMatch.value,
                        };
                    }
                    childMatches = null;
                    childIndex++;
                }
            }
            return { done: true, value: undefined };
        },
    };
}

/**
 * Universal Router (https://www.kriasoft.com/universal-router/)
 *
 * Copyright (c) 2015-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
function resolveRoute(context, params) {
    if (typeof context.route.action === 'function') {
        return context.route.action(context, params);
    }
    return undefined;
}

/**
 * Universal Router (https://www.kriasoft.com/universal-router/)
 *
 * Copyright (c) 2015-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
class UniversalRouterSync {
    constructor(routes, options = { context: {} }) {
        if (!routes || typeof routes !== 'object') {
            throw new TypeError('Invalid routes');
        }
        this.baseUrl = options.baseUrl || '';
        this.errorHandler = options.errorHandler;
        this.resolveRoute = options.resolveRoute || resolveRoute;
        this.context = { router: this, ...options.context };
        this.root = Array.isArray(routes) ? { path: '', children: routes, parent: null } : routes;
        this.root.parent = null;
    }
    resolve(pathnameOrContext) {
        const context = {
            ...this.context,
            ...(typeof pathnameOrContext === 'string'
                ? { pathname: pathnameOrContext }
                : pathnameOrContext),
        };
        const match = matchRoute(this.root, this.baseUrl, context.pathname.substr(this.baseUrl.length), [], null);
        const resolve = this.resolveRoute;
        let matches = null;
        let nextMatches = null;
        let currentContext = context;
        function next(resume, parent = matches && matches.value ? matches.value.route : null, prevResult) {
            const lastRoute = matches && matches.value ? matches.value.route : null;
            const routeToSkip = prevResult === null ? lastRoute : null;
            matches = nextMatches || match.next(routeToSkip);
            nextMatches = null;
            if (!resume) {
                if (matches.done || !isChildRoute(parent, matches.value.route)) {
                    nextMatches = matches;
                    return null;
                }
            }
            if (matches.done) {
                const error = new Error('Route not found');
                error.status = 404;
                throw error;
            }
            currentContext = { ...context, ...matches.value };
            const result = resolve(currentContext, matches.value.params);
            if (result !== null && result !== undefined) {
                return result;
            }
            return next(resume, parent, result);
        }
        context.next = next;
        try {
            return next(true, this.root);
        }
        catch (error) {
            if (this.errorHandler) {
                return this.errorHandler(error, currentContext);
            }
            throw error;
        }
    }
}
UniversalRouterSync.pathToRegexp = pathToRegexp;

export default UniversalRouterSync;
//# sourceMappingURL=universal-router-sync.esm.js.map