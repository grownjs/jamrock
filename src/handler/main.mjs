import { rankify, routify, extract, rematch } from './utils.mjs';
import { Template } from '../templ/main.mjs';
import { set } from '../server/utils.mjs';
import { req } from './match.mjs';

const RE_DEFAULT_NAME = /export\s+default\s*\{[^{};]*\bas\s*:\s*(["'])([\w.]+)\1/;

export async function middleware(ctx, props, actions) {
  const { method, request_path, current_path, current_module } = ctx.conn;
  const result = await req(ctx.conn, ctx.called, props, actions, ctx.shared);

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
  const { routes } = routify(from.map(x => x.replace(cwd, '')));
  const collection = [];

  for (const route of routes) {
    const layout = route.get('layout');
    const error = route.get('error');

    route.options.layout = layout ? cwd + layout.replace(cwd, '') : null;
    route.options.error = error ? cwd + error.replace(cwd, '') : null;
    route.options.src = cwd + route.options.page;

    delete route.options.page;
    delete route.options.parent;

    const code = Template.read(route.options.src);
    const matches = extract(code);

    const key = code.match(RE_DEFAULT_NAME) || [];

    route.options.name = route.options.name || key[2];

    matches.forEach(subroute => {
      const path = (route.options.path + subroute.path).replace(/\/$/, '');
      const { depth, params } = rankify(path);

      subroute.layout = route.options.layout;
      subroute.error = route.options.error;
      subroute.keys = params;
      subroute.path = path;
      subroute.lvl = depth;
      subroute.src = route.options.src;
      collection.push(rematch(subroute));
    });

    collection.push(rematch(route.options));
  }

  collection.forEach(route => {
    set(collection, route.name, route);
  });

  return Object.freeze(collection.sort((a, b) => b.lvl - a.lvl));
}
