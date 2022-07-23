import { rematch, routify, routes } from './utils.mjs';
import { Template } from '../templ/main.mjs';
import { flatten } from '../utils.mjs';
import { req } from './match.mjs';

const RE_BASENAME = /^(.+?)\.\w+$/;

export async function middleware(ctx, props, actions) {
  if (ctx.file) {
    ctx.conn.base_url = ctx.file.replace(ctx.cwd, '').match(RE_BASENAME)[1];
  }

  const { res, method, request_path, current_module } = ctx.conn;
  const [status, body, err] = await req(ctx.conn, ctx.called, props, actions, ctx.shared);

  res.statusCode = status;

  if (status === 404) {
    throw new Error(`Route '${method} ${request_path.replace(ctx.conn.base_url, '') || '/'}' not found in ${current_module}`);
  }
  if (err) {
    throw err;
  }
  return body;
}

export async function controllers(cwd, from) {
  const main = [];
  const all = await Promise.all(Template.glob(`${cwd}/${from}`).map(src => {
    const paths = [];

    let base = routify(src.replace(cwd, '').replace(/\.\w+$/, ''));
    if (typeof base === 'object') {
      if (base.kind !== 'page') return [];

      const parts = base.path.split(/(?=\/[:*])/);

      if (parts.length > 1) {
        paths.push({ src, base: parts[0], kind: base.kind, path: parts.slice(1).join('') });
      } else {
        paths.push({ src, base: parts[0], kind: base.kind, path: '/' });
      }
      base = parts[0];
    } else if (!main.some(x => x.base === base)) {
      main.push({ src, base, kind: 'page', path: '/' });
    }

    if (src.includes('.mjs') || src.includes('.cjs') || src.includes('.js')) {
      return Template.import(src).then(result => (result.paths || []).map(x => ({ ...x, src, base })).concat(paths));
    }
    return routes(Template.read(src)).map(x => ({ ...x, src, base })).concat(paths);
  })).then(result => flatten(result));

  main.forEach(route => {
    if (!all.some(x => x.base === route.base)) all.push(route);
  });

  all.forEach(route => {
    rematch(route);

    if (all[route.name]) {
      throw new Error(`Named route '${route.name}' already exists!`);
    }

    all[route.name] = route;
  });
  return Object.freeze(all);
}
