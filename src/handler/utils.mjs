import { isArray, camelCase } from '../utils.mjs';

const RE_MATCH_ROUTES = /\[(['"])(GET|POST|PUT|PATCH|DELETE)(\s\/[^'"]*?)?\1\]\s*(\s+as\s+\w+|\/\*\w+\*\/)?(?=:)/g;
const RE_PAGE_TYPE = /\+(page|error|layout)(?:\.\w+)?$/;

const CACHED_PARAMS = new Map();
const CACHED_ROUTES = new Map();

export function score(parts) {
  let depth = -1;
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i].charAt() === '*') depth += 1;
    else if (parts[i].charAt() === ':') depth += 2;
    else depth += 10;
  }
  return depth;
}

export function extract(route) {
  if (!CACHED_PARAMS.has(route)) {
    const matches = route.match(/[:*](\w+)/g);
    const params = [];

    if (matches) {
      matches.forEach(x => {
        params.push(x.substr(1));
      });
    }
    CACHED_PARAMS.set(route, params);
  }
  return CACHED_PARAMS.get(route);
}

export function rematch(route) {
  const fn = params => {
    const query = (params && params.query) || {};

    params = (params && params.params) || params;
    params = params || { _: '' };

    if (isArray(params)) {
      params = { _: params.join('/') };
    }
    if (typeof params === 'string' || typeof params === 'number') {
      params = { _: params };
    }

    const url = route.fullpath.replace(/[:*](\w+)\??/g, (_, k) => params[k] || '').replace(/\/$/, '');
    const q = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';

    return url.replace(/\/{2,}/g, '/') + q;
  };

  Object.defineProperty(fn, 'toString', {
    value: () => {
      throw new Error(`You should call '${route.name}.url()'`);
    },
  });

  route.url = fn;
  route.verb = route.verb || 'GET';
  route.depth = score(route.path.split('/').slice(1));
  route.params = extract(route.path);
  route.fullpath = (route.base + route.path).replace(/\/$/, '');
  delete route.base;

  if (!route.name) {
    route.name = camelCase([route.verb, route.fullpath.replace(/\W+/g, '-')].join('').toLowerCase());
  }
  return route;
}

export function routify(filepath) {
  const matches = filepath.match(RE_PAGE_TYPE);
  const path = filepath
    .replace(/__\w+\/|\/\+.+|\.(?:html|mjs|cjs)|index/g, '')
    .replace(/\[\.\.\.(\w+)\]/g, '*$1')
    .replace(/\((\w+)\)[./]/g, ':$1?/')
    .replace(/\[(\w+)\]/g, ':$1')
    .replace(/\./g, '/');

  if (matches) {
    return { path: path || '/', kind: matches[1] };
  }
  return path || '/';
}

export function regexify(pathname) {
  if (!CACHED_ROUTES.has(pathname)) {
    let regex = pathname
      .replace(/\/\*\w+/g, '(?:/(.*))?')
      .replace(/:\w+/g, '([^/]+)')
      .replace(/^/, '^');

    if (regex.substr(-1) === '/') {
      regex += '?';
    }

    CACHED_ROUTES.set(pathname, new RegExp(regex));
  }
  return CACHED_ROUTES.get(pathname);
}

export function routes(code, modify) {
  if (modify) {
    const all = [];

    code = code.replace(RE_MATCH_ROUTES, (_, qt, verb, path, name) => {
      const fixedName = name ? name.split(' as ').pop().trim() : undefined;

      all.push({ verb, path: path ? path.trim() : '/', name: fixedName });
      return name ? _.replace(name, `/*${fixedName}*/`) : _;
    });

    return { code, routes: all };
  }

  const test = code.match(RE_MATCH_ROUTES);

  return (test || []).map(chunk => {
    const [sub, name] = chunk.split(' as ');
    const [verb, path] = sub.substr(2, sub.length - 4).split(' ');

    return { verb, path: path || '/', name };
  });
}
