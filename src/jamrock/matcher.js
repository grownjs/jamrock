const qs = require('querystring');
const glob = require('glob');

const {
  use, join, nodir, realpath,
} = require('../util');

function score(parts) {
  let depth = -1;
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i].charAt() === '*') depth += 1;
    else if (parts[i].charAt() === ':') depth += 2;
    else depth += 10;
  }
  return depth;
}

function extract(route) {
  const matches = route.match(/\/:(\w+)|\/\*all/g);
  const params = [];

  if (matches) {
    matches.forEach(x => {
      params.push(x.substr(2));
    });
  }
  return params;
}

function replace(route) {
  const fn = params => {
    const query = (params && params.query) || {};

    params = (params && params.params) || params;
    params = params || { _: '' };

    if (Array.isArray(params)) {
      params = { _: params.join('/') };
    }
    if (typeof params === 'string' || typeof params === 'number') {
      params = { _: params };
    }

    const url = route.path.replace(/\/[:*](\w+)?/g, (_, k) => `/${params[k || '_']}`).replace(/\/$/, '');
    const q = Object.keys(query).length ? `?${qs.stringify(query)}` : '';

    return url + q;
  };
  fn.toString = () => {
    throw new Error(`You should call '${route.name}()'`);
  };
  route.url = fn;
  return fn;
}

function collect(mod) {
  return Object.keys(mod).filter(x => /^(?:GET|PUT|POST|PATCH|DELETE)/.test(x));
}

function transform(filepath) {
  return `/${filepath.replace(/\/\$(\w+)/g, '/:$1').replace('/index', '/*all').replace(/\./g, '/')}`;
}

function routes(from) {
  const _handlers = from.reduce((memo, cwd) => memo.concat(glob.sync('**/*.js', { cwd })
    .filter(filepath => nodir(filepath).charAt() !== '_')
    .map(filepath => {
      const handler = use(realpath(join(cwd, filepath)));
      const filename = filepath.replace('.js', '');
      const routeInfo = {
        name: handler.as
          || filename.replace(/^\d/, '_$&').replace(/\W+/g, '_') + (filename, cwd === 'routes' ? '_path' : '_page'),
        kind: cwd === 'routes' ? 'api' : 'page',
        file: realpath(join(cwd, filepath)),
        path: transform(filename),
      };

      routeInfo.verbs = collect(handler);
      routeInfo.depth = score(routeInfo.path.split('/').slice(1));
      routeInfo.params = extract(routeInfo.path);

      return routeInfo;
    })), []);

  const _routes = [];

  _handlers.sort((a, b) => b.depth - a.depth)
    .forEach(routeInfo => {
      _routes.push(...((routeInfo.verbs.length ? routeInfo.verbs : null) || ['GET'])
        .map(method => ({
          ...routeInfo,
          as: method.includes(' ')
            ? routeInfo.name.replace(/_(\w+)$/, `${method.split(' ').pop().replace(/\W+|$/g, '_')}$1`)
            : routeInfo.name,
          verb: method.split(' ')[0],
          path: method.includes(' ')
            ? routeInfo.path + method.split(' ').pop()
            : routeInfo.path,
          route: !method.includes(' '),
          handler: [routeInfo.kind],
        })));
    });

  _routes.forEach(route => {
    _routes[route.name] = replace(route);
  });

  return _routes;
}

function match(ctx, route, partial) {
  let [method, pathname] = route.split(' ');

  if (!pathname) {
    pathname = method;
    method = ctx.method;
  }

  const values = ctx.path_info.slice();

  if (pathname && ctx.method === method) {
    if (pathname === ctx.request_path) {
      return route;
    }

    const params = {};
    const parts = pathname.split('/').slice(1);
    if (parts[parts.length - 1] === '') parts.pop();

    for (let j = 0; j < parts.length; j += 1) {
      const a = parts[j];
      const b = values[j];

      if (a.charAt() === ':') {
        params[a.substr(1)] = b;
        if (j < parts.length - 1) continue; // eslint-disable-line
      } else if (a.charAt() === '*' && values.length + 1 >= parts.length) {
        params[a.substr(1) || '_'] = values.slice(j);
        ctx.req.params = params;
        return route;
      } else if (a !== b) return;
      else if (!partial) continue; // eslint-disable-line

      if (values.length >= parts.length) {
        if (a.charAt() === '*') {
          params._ = values.slice(parts.length - 1);
          ctx.req.params = params;
          return route;
        }

        ctx.req.params = params;
        return route;
      }
    }
  }
}

async function req(ctx, called, actions, container) {
  let result;
  if (actions[ctx.method]) {
    result = await actions[ctx.method](ctx, container);
    called = true;
  }

  const _routes = Object.keys(actions).reduce((memo, cur) => {
    const route = match(ctx, cur, true);
    if (route) memo.push(route);
    return memo;
  }, []);

  if (_routes.length) {
    for (const route of _routes) {
      result = await actions[route](ctx, container);
    }
    called = true;
  }

  if (!called && (ctx.method !== 'GET' || ctx.path_info.length > 1)) {
    throw new Error(`Route not found in ${ctx.current_module}`);
  }
  return { called, result };
}

module.exports = { req, match, routes };
