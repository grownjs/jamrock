import { RE_MATCH_ROUTES } from 'eslint-plugin-jamrock/const.js';
import { Is, camelCase, snakeCase } from '../utils/server.ts';

class Route {
  options: any;
  [key: string]: any;

  constructor(parent: Route | null) {
    this.options = { parent };
  }

  get(prop: string): any {
    const parent = this.options.parent;
    return typeof this.options[prop] !== 'undefined'
      ? this.options[prop] : ((parent && parent.get(prop)) || null);
  }

  all(prop: string, cb: (value: any) => any): any[] {
    const parent = this.options.parent;
    const values: any[] = [];

    if (this.options[prop]) {
      values.push(cb(this.options[prop]));
    }

    if (parent) {
      values.push(...parent.all(prop, cb));
    } else if (this.options.all) {
      values.push(...this.options.all);
    }

    return values;
  }
}

export function rebase(str: string, cwd?: string): string | null {
  if (!str) return null;
  if (cwd) str = str.replace(cwd, '.');
  return str.replace(/\.\.\//g, '').replace('./', '');
}

export function regexify(route: string): RegExp {
  // translate parameters into captures
  route = route.replace(/\/\*\w+/g, '(?:/(.*))?');
  route = route.replace(/:\w+/g, '([^/]+)');

  // remove slash after extensions
  route = route.replace(/(\.\w+)\//, '$1');

  // trailing slash is optional
  route = route.replace(/\/$/, '/?');

  return new RegExp(`^${route}${route.substr(-2) === '/?' ? '$' : '/?'}`);
}

export function rankify(route: string): { depth: number; params: string[] } {
  const parts = route.split(/(?=[*:/])/);
  const params: string[] = [];

  let depth = -1;
  for (let i = 0; i < parts.length; i++) {
    if (':*'.includes(parts[i][0])) {
      depth += parts[i][0] === '*' ? 1 : 2;
      params.push(parts[i]);
    } else {
      depth += parts[i].length * 3;
    }
  }
  return { depth, params };
}

export function routify(cwd: string, set: string[]): { api: any[]; tree: Route; routes: Route[] } {
  const tree = new Route(null);
  const routes: Route[] = [];
  const api: any[] = [];

  set.forEach(src => {
    // clean extensions and _hidden segments
    let path = src
      .replace(`${cwd}/`, '/')
      .replace(/index|(?<=\/)_\w+\/|\.\w+$/g, '');

    // replace sveltekit-like parameters
    path = path.replace(/\[\.\.\.(\w+)\]/g, '*$1');
    path = path.replace(/\((\w+)\)[./]/g, ':$1?/');
    path = path.replace(/\[(\w+)\]/g, ':$1');
    path = path.replace(/\w(?=\+)/g, '$&/');

    // apply some stuff from remix-flat-routes
    path = path.replaceAll('.', '/');
    path = path.replace(/\$(\w+)/g, ':$1');
    path = path.replace(/\(\$(\w+)\)/g, ':$1?/');
    path = path.replace(/\[\/(\w+)\]/g, '\\.$1/');

    const parts = path.split('/').filter(x => x.length > 0);

    let leaf: Route = tree;
    while (parts.length > 0) {
      const key = parts.shift()!;

      if (key[0] === '+') {
        let route = path.replace(/\/\+\w+/g, '');
        route = route[0] !== '/' ? `/${route}` : route;

        if (key === '+server') {
          leaf.options.middleware = rebase(src);
          api.push({ src, route });
        } else {
          leaf.options[key.substr(1)] = src;
        }

        if (key === '+page') {
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

  return { api, tree, routes };
}

export function extract(code: string, modify?: boolean): any {
  const blocks: string[] = [];

  code = code.replace(/```[^]+?```/g, block => {
    blocks.push(block);
    return '\0';
  });

  const isMarkup = !modify && code.includes('<script>');

  let script = code;
  if (isMarkup) {
    script = '';
    code.replace(/<script>[\s\S]*?<\/script>/, _ => {
      script = _;
      return _;
    });
  }

  if (modify) {
    const old = script;
    const matches: any[] = [];

    script = script.replace(RE_MATCH_ROUTES, (_: string, verb: string, path: string, alias: string) => {
      const fixedName = alias ? alias.split(' as ').pop()!.trim() : undefined;

      matches.push({ verb, path: (path || '/').trim(), name: fixedName });
      return alias ? _.replace(alias, `/*${fixedName}*/`) : _;
    });

    script = isMarkup ? code.replace(old, script) : script;
    script = script.replace(/\0/g, () => blocks.shift()!);

    return {
      code: script,
      routes: matches,
    };
  }

  const test = script.match(RE_MATCH_ROUTES);

  return (test || []).map(chunk => {
    const [sub, name] = chunk.split(' as ');
    const [verb, path] = sub.replace(/[["'\]]+/g, '').split(' ');

    return { verb, name, path: (path || '/').trim() };
  });
}

export function buildParams(keys: string[], values: any[]): Record<string, any> {
  return keys.reduce((memo: Record<string, any>, key: string, i: number) => {
    memo[key] = values[i];
    return memo;
  }, {});
}

export function rematch(route: any): any {
  const fn = (params: any, query?: any) => {
    const data = Is.arr(params) ? buildParams(route.params, params) : params;
    const url = route.path.replace(/[:*](\w+)\??/g, (_: string, k: string) => data[k] || '').replace(/\/$/, '') || '/';
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
  route.params = route.keys.map((x: string) => x.substr(1).replace('?', ''));

  if (!route.name) {
    const path = route.path === '/' ? 'Home' : camelCase(snakeCase(route.path));

    route.name = [route.verb.toLowerCase(), path].join('');
    route.name += route.root ? 'Page' : '';
  }
  return route;
}
