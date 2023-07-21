import { rankify, routify, extract, rematch } from './utils.mjs';
import { Template } from '../templ/main.mjs';
import { Is, set } from '../utils/server.mjs';
import { req } from './match.mjs';

const RE_DEFAULT_NAME = /export\s+default\s*\{[^{};]*\bas\s*:\s*(["'])([\w.]+)\1/;

export async function preflight(conn, module, options, container) {
  if (!module) return;

  let result;
  if (module.http) {
    result = await module.http(conn);
  }
  if (!result && options.use) {
    for (const call of options.use) {
      const [fn, opts] = [].concat(call);

      if (!Is.func(module[fn])) {
        throw new TypeError(`Middleware '${fn}' is not a function`);
      }

      result = await module[fn].call(container, conn, { ...opts });
      if (result) break;
    }
  }
  if (!result && module[conn.method]) {
    result = await module[conn.method].call(container, conn);
  }
  return result;
}

export async function middleware(ctx, actions) {
  const { method, request_path, current_path, current_module } = ctx.conn;
  const result = await req(ctx.conn, ctx.called, actions, ctx.shared);

  if (result === 404 || result instanceof Error) {
    const E = new Error(result === 404
      ? `Route '${method} ${request_path.replace(current_path, '') || '/'}' not found in ${current_module}`
      : result.stack);

    E.status = result instanceof Error ? result.status : result;
    throw E;
  }
  return result;
}

export function controllers(cwd, from) {
  const { api, routes } = routify(from.map(_ => _.replace(cwd, '')));
  const collection = [];

  for (const route of routes) {
    const _middleware = route.get('middleware');
    const layout = route.get('layout');
    const error = route.get('error');

    route.options.middleware = _middleware ? cwd + _middleware.replace(cwd, '') : null;
    route.options.layout = layout ? cwd + layout.replace(cwd, '') : null;
    route.options.error = error ? cwd + error.replace(cwd, '') : null;
    route.options.all = route.all('page', _ => cwd + _);
    route.options.src = route.options.all[0];

    delete route.options.page;
    delete route.options.parent;

    const code = Template.read(route.options.src);
    const matches = extract(code);

    const key = code.match(RE_DEFAULT_NAME) || [];

    route.options.name = route.options.name || key[2];

    matches.forEach(subroute => {
      const path = (route.options.path + subroute.path).replace(/\/$/, '');
      const { depth, params } = rankify(path);

      subroute.middleware = route.options.middleware;
      subroute.layout = route.options.layout;
      subroute.error = route.options.error;
      subroute.base = subroute.path;
      subroute.keys = params;
      subroute.path = path;
      subroute.lvl = depth;
      subroute.all = route.options.all;
      subroute.src = route.options.src;
      collection.push(rematch(subroute));
    });

    collection.push(rematch(route.options));
  }

  const _middlewares = api.map(_ => _.src);

  api.forEach(({ src, route }) => {
    const code = Template.read(cwd + src);
    const matches = extract(code);

    matches.forEach(subroute => {
      const path = (route + subroute.path).replace(/\/$/, '');
      const { depth, params } = rankify(path);

      subroute.middlewares = [];
      subroute.middleware = cwd + src;
      subroute.base = subroute.path;
      subroute.keys = params;
      subroute.path = path;
      subroute.lvl = depth;
      collection.push(rematch(subroute));

      const parts = src.split('/');

      parts.pop();
      parts.pop();
      while (parts.length > 0) {
        const key = `${parts.join('/')}/+server.mjs`;

        parts.pop();

        if (_middlewares.includes(key)) {
          subroute.middlewares.push(cwd + key);
        }
      }
    });
  });

  collection.forEach(route => {
    set(collection, route.name, route);
  });

  return Object.freeze(collection.sort((a, b) => b.lvl - a.lvl));
}

export async function middlewares(ctx, route, modules) {
  let result;
  try {
    while (modules.length > 0) {
      const mod = modules.pop();

      try {
        result = await preflight(ctx.conn, mod, ctx.conn.current_options, ctx.shared);

        const _method = `${ctx.conn.method} ${route.base}`;

        if (!result && mod.default?.[_method]) {
          result = await mod.default[_method].call(ctx.shared, ctx.conn);
        }
      } catch (e) {
        if (mod.default?.catch) {
          result = await mod.default.catch.call(ctx.shared, e, ctx.conn);
        } else {
          throw e;
        }
      } finally {
        if (mod.default?.finally) {
          result = await mod.default.finally.call(ctx.shared, result, ctx.conn);
        }
      }
      if (result) break;
    }
  } catch (e) {
    console.log('E_MIDDLEWARES', e);
  }
  return result;
}
