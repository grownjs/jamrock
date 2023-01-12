import { RE_MATCH_ROUTES } from 'eslint-plugin-jamrock/const.js';
import { Is, camelCase } from '../utils/server.mjs';

class Route {
  constructor(parent) {
    this.options = { parent };
  }

  get(prop) {
    const parent = this.options.parent;
    return typeof this.options[prop] !== 'undefined'
      ? this.options[prop] : ((parent && parent.get(prop)) || null);
  }
}

export function regexify(route) {
  // translate parameters into captures
  route = route.replace(/\/\*\w+/g, '(?:/(.*))?');
  route = route.replace(/:\w+/g, '([^/]+)');

  // remove slash after extensions
  route = route.replace(/(\.\w+)\//, '$1');

  // trailing slash is optional
  route = route.replace(/\/$/, '/?');

  return new RegExp(`^${route}${route.substr(-2) === '/?' ? '$' : '/?'}`);
}

export function rankify(route) {
  const parts = route.split(/(?=[*:/])/);
  const params = [];

  let depth = -1;
  for (let i = 0; i < parts.length; i++) {
    if (':*'.includes(parts[i].charAt())) {
      depth += parts[i].charAt() === '*' ? 1 : 2;
      params.push(parts[i]);
    } else {
      depth += parts[i].length * 3;
    }
  }
  return { depth, params };
}

export function routify(set) {
  const tree = new Route(null);
  const routes = [];

  set.forEach(src => {
    // clean extensions and _hidden segments
    let path = src.replace(/index|(?<=\/)_\w+|\.\w+$/g, '');

    // replace sveltekit-like parameters
    path = path.replace(/\[\.\.\.(\w+)\]/g, '*$1');
    path = path.replace(/\((\w+)\)[./]/g, ':$1?/');
    path = path.replace(/\[(\w+)\]/g, ':$1');
    path = path.replace(/\w(?=\+)/g, '$&/');

    // apply some stuff from remix-flat-routes
    path = path.replaceAll('.', '/');
    path = path.replace(/\$(\w+)/g, ':$1');
    path = path.replace(/\((\w+)\)/g, ':$1?/');
    path = path.replace(/\[\/(.+?)\]/g, '\\.$1/');

    const parts = path.split('/').filter(x => x.length > 0);

    let leaf = tree;
    while (parts.length > 0) {
      const key = parts.shift();

      if (key.charAt() === '+') {
        leaf.options[key.substr(1)] = src;
        if (key === '+page') {
          let route = path.replace(/\/?[_+]\w+/g, '');
          route = route.charAt() !== '/' ? `/${route}` : route;

          const { depth, params } = rankify(route);

          leaf.options.keys = params;
          leaf.options.path = route;
          leaf.options.root = true;
          leaf.options.lvl = depth;
          routes.push(leaf);
        }
        break;
      }
      const segment = `/${key}`;
      leaf[segment] = leaf[segment] || new Route(leaf);
      leaf = leaf[segment];
    }
  });

  return { tree, routes };
}

export function extract(code, modify) {
  if (modify) {
    const all = [];

    code = code.replace(RE_MATCH_ROUTES, (_, verb, path, alias) => {
      const fixedName = alias ? alias.split(' as ').pop().trim() : undefined;

      all.push({ verb, path: (path || '/').trim(), name: fixedName });
      return alias ? _.replace(alias, `/*${fixedName}*/`) : _;
    });

    return { code, routes: all };
  }

  const test = code.match(RE_MATCH_ROUTES);

  return (test || []).map(chunk => {
    const [sub, name] = chunk.split(' as ');
    const [verb, path] = sub.replace(/[["'\]]+/g, '').split(' ');

    return { verb, name, path: (path || '/').trim() };
  });
}

export function rematch(route) {
  const fn = (params, query) => {
    const data = Is.arr(params) ? params.reduce((memo, cur, i) => Object.assign(memo, { [route.params[i]]: cur }), {}) : params;
    const url = route.path.replace(/[:*](\w+)\??/g, (_, k) => data[k] || '').replace(/\/$/, '') || '/';
    const qs = new URLSearchParams(query || '').toString();

    let out = url.replace(/\/{2,}/g, '/');
    if (qs) out += `?${qs}`;
    return out;
  };

  Object.defineProperty(fn, 'toString', {
    value: () => {
      throw new Error(`You should call '${route.name}.url()'`);
    },
  });

  route.url = fn;
  route.re = regexify(route.path);
  route.verb = route.verb || 'GET';
  route.params = route.keys.map(x => x.substr(1).replace('?', ''));

  if (!route.name) {
    route.name = [route.verb.toLowerCase(), route.path === '/' ? 'Home' : camelCase(route.path.replace(/\W+/g, '-'))].join('');
    route.name += route.root ? 'Page' : '';
  }
  return route;
}
