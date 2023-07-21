import { Is } from '../utils/server.mjs';
import { rankify } from './utils.mjs';

const CACHED_ROUTES = new Map();

export function match(ctx, route, allowed = []) {
  if (ctx.method === route.verb || allowed.includes(ctx.method)) {
    if (route.path === ctx.request_path) {
      return {
        ...route,
        params: route.params
          .reduce((memo, key, i) => Object.assign(memo, { [key]: route.keys[i] }), {}),
      };
    }

    const matches = ctx.request_path.match(route.re);

    if (matches) {
      return {
        ...route,
        params: route.params.reduce((memo, key, i) => {
          memo[key] = matches[i + 1];
          return memo;
        }, {}),
      };
    }
  }
}

export async function req(ctx, call, actions, container) {
  let result;
  const _routes = Object.keys(actions).reduce((memo, key) => {
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
