import { regexify, extract } from './utils.mjs';

export function match(ctx, path) {
  let [method, pathname] = path.split(' ');
  if (!pathname) {
    pathname = method.charAt() === '/' ? method : '/';
    method = method.charAt() === '/' ? ctx.method : method;
  }

  if (ctx.base_url) {
    pathname = ctx.base_url + pathname;
  }

  if (pathname && ctx.method === method) {
    if (pathname === ctx.request_path) {
      return { path, params: [] };
    }

    const regex = regexify(pathname);
    const params = extract(pathname);
    const matches = ctx.request_path.match(regex);

    if (matches) {
      return {
        path,
        params: params.reduce((memo, key, i) => {
          memo[key] = matches[i + 1];
          return memo;
        }, {}),
      };
    }
  }
}

export async function req(ctx, call, props, actions, container) {
  let result;
  const _routes = Object.keys(actions).reduce((memo, route) => {
    const matches = match(ctx, route);

    if (matches) memo.push(matches);
    return memo;
  }, []);

  try {
    if (_routes.length) {
      for (const { path, params } of _routes) {
        result = await actions[path](ctx, { ...params, ...props }, container);
      }
      call = true;
    }

    if (!call && actions[ctx.method]) {
      result = await actions[ctx.method](ctx, props, container);
      call = true;
    }

    if (!call && (ctx.method !== 'GET' || ctx.path_info.length > 1)) return [404];
    return [ctx.res.statusCode, result];
  } catch (e) {
    return [e.status || 500, result, e];
  }
}
