import { rankify, routify, extract, rematch, rebase } from './utils.ts';
import { Is, set, trace, concat } from '../utils/server.ts';
import { Template } from '../templ/main.ts';
import { req } from './match.ts';

const RE_DEFAULT_NAME = /export\s+default\s*\{[^{};]*\bas\s*:\s*(["'])([\w.]+)\1/;

export async function preflight(conn: any, module: any, options: any, container: any): Promise<any> {
  if (!module) return;

  let result;
  if (module.http) {
    result = await module.http(conn);
  }
  if (!result && options.use) {
    for (const call of options.use) {
      const [fn, opts] = ([] as any[]).concat(call);

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

export async function middleware(ctx: any, actions: any): Promise<any> {
  const { method, request_path, current_path, current_module } = ctx.conn;
  const result = await req(ctx.conn, ctx.called, actions, ctx.shared);

  if (result === 404 || result instanceof Error) {
    const E: any = new Error(result === 404
      ? `Route '${method} ${request_path.replace(current_path, '') || '/'}' not found in ${current_module}`
      : (result as Error).stack);

    E.status = result instanceof Error ? (result as any).status : result;
    throw E;
  }
  return result;
}

export function controllers(cwd: string, from: string[]): any {
  const { api, routes } = routify(cwd, from);
  const collection: any[] = [];

  function push(route: any): void {
    const found = collection.find(_ => _.verb === route.verb && _.path === route.path);

    if (found) {
      Object.assign(found, route);
    } else {
      collection.push(route);
    }
  }

  for (const route of routes) {
    const _middleware = route.get('middleware');
    const layout = route.get('layout');
    const error = route.get('error');

    route.options.middleware = rebase(_middleware);
    route.options.layout = rebase(layout);
    route.options.error = rebase(error);

    route.options.all = route.all('page', rebase);
    route.options.src = route.options.all[0];
    route.options.kind = 'page';

    delete route.options.page;
    delete route.options.parent;

    const code = Template.read(route.options.src);
    const matches = extract(code);

    const key = code.match(RE_DEFAULT_NAME) || [];

    route.options.name = route.options.name || key[2];

    matches.forEach((subroute: any) => {
      const path = concat(route.options.path, subroute.path);
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
      subroute.kind = 'api';
      push(rematch(subroute));
    });

    push(rematch(route.options));
  }

  const _middlewares = api.map(_ => _.src);

  api.forEach(({ src, route }: any) => {
    const code = Template.read(src);
    const matches = extract(code);

    matches.forEach((subroute: any) => {
      const path = concat(route, subroute.path);
      const { depth, params } = rankify(path);

      subroute.middlewares = [];
      subroute.middleware = rebase(src);
      subroute.base = subroute.path;
      subroute.keys = params;
      subroute.path = path;
      subroute.lvl = depth;
      subroute.kind = 'api';
      push(rematch(subroute));

      const parts = src.split('/');

      parts.pop();
      parts.pop();
      while (parts.length > 0) {
        const key = `${parts.join('/')}/+server.mjs`;

        parts.pop();

        if (_middlewares.includes(key)) {
          subroute.middlewares.push(rebase(key));
        }
      }
    });
  });

  collection.forEach(route => {
    set(collection as any, route.name, route);
  });

  return Object.freeze(collection.sort((a, b) => b.lvl - a.lvl));
}

export async function middlewares(ctx: any, route: any, modules: any[]): Promise<any> {
  const _method = `${ctx.conn.method} ${route.base}`;

  let result;
  try {
    while (modules.length > 0) {
      const mod = modules.pop();

      try {
        result = await preflight(ctx.conn, mod, ctx.conn.current_options, ctx.shared);

        if (!result && mod.default?.[_method]) {
          result = await mod.default[_method].call(ctx.shared, ctx.conn);
        }
      } catch (e: any) {
        trace(e, 'E_MIDDLEWARE');
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
  } catch (e: any) {
    trace(e, 'E_MIDDLEWARES');
  }
  return result;
}
