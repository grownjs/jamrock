import { Is } from '../utils/server.ts';
import { rankify, buildParams } from './utils.ts';

const CACHED_ROUTES = new Map();

export function match(ctx: any, route: any, allowed: string[] = []): any {
  if (ctx.method === route.verb || allowed.includes(ctx.method)) {
    if (route.path === ctx.request_path) {
      return {
        ...route,
        params: buildParams(route.params, route.keys),
      };
    }

    const matches = ctx.request_path.match(route.re);

    if (matches) {
      return {
        ...route,
        params: buildParams(route.params, matches.slice(1)),
      };
    }
  }
}

export async function req(ctx: any, call: any, actions: any, container: any): Promise<any> {
  let result;
  const _routes = Object.keys(actions).reduce((memo: any[], key: string) => {
    if (!CACHED_ROUTES.has(ctx.current_path + key)) {
      const [verb, path] = key.replace(/\s|$/, ` ${ctx.current_path}`).split(' ');
      const { depth, params } = rankify(path);

      CACHED_ROUTES.set(ctx.current_path + key, {
        verb,
        lvl: depth,
        keys: params,
        params: params.map(x => x.substr(1).replace('?', '')),
        src: ctx.current_module,
        path: path.replace(/\/$/, ''),
      });
    }

    const route = CACHED_ROUTES.get(ctx.current_path + key);
    const found = match(ctx, route);

    if (found) memo.push({ key, found });
    return memo;
  }, []);

  if (_routes.length) {
    const { key, found } = _routes[0];

    if (Is.func(actions[key])) {
      result = await actions[key].call(container, found.params);
      call = true;
    } else {
      call = actions[key];
    }
  }
  if (!call && (ctx.method !== 'GET' || ctx.path_info.length > 1)) return 404;
  return result;
}
