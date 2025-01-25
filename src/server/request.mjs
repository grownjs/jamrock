import { Template, Handler, Markup, Util } from 'jamrock/core';
import { generateClientCode } from 'jamrock/client';

export function parseCookies(cookie) {
  if (!cookie) return {};

  const pairs = cookie.split(/;\s*/g);
  const cookies = {};

  for (let i = 0, len = pairs.length; i < len; i++) {
    const [k, v] = pairs[i].split(/\s*=\s*([^\s]+)/);

    cookies[k] = decodeURIComponent(v);
  }
  return cookies;
}

export function buildCookie(name, value, options = {}) {
  value = encodeURIComponent(value);

  let cookie = `${name}=${value}`;
  if (options.maxAge) cookie += `; Max-Age=${Math.floor(options.maxAge)}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.secure) cookie += '; Secure';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  return cookie;
}

export function getCookies(obj) {
  return Object.keys(obj).reduce((memo, cur) => {
    return memo.concat(obj[cur] ? buildCookie(cur, obj[cur].value, obj[cur].options) : []);
  }, []);
}

export function getError(code, message) {
  const e = new Error(message);

  e.status = code;
  throw e;
}

export function getReadable(stream, callback) {
  let size = 0;
  let cancelled = false;
  return new ReadableStream({
    start(controller) {
      stream.on('error', err => {
        cancelled = true;
        controller.error(err);
      });

      stream.on('end', () => {
        if (cancelled) return;
        controller.close();
      });

      stream.on('data', chunk => {
        if (cancelled) return;
        if (Util.Is.func(callback) && callback(size, controller)) {
          cancelled = true;
          return;
        }

        controller.enqueue(chunk);
        if (controller.desiredSize === null || controller.desiredSize <= 0) stream.pause();
      });
    },

    pull() {
      stream.resume();
    },

    cancel(reason) {
      cancelled = true;
      stream.destroy(reason);
    },
  });
}

export function getRawBody(req, limit) {
  if (!req.headers['content-type'] || ['GET', 'HEAD'].includes(req.method)) return null;

  const maxlen = Number(req.headers['content-length']);

  if (
    (req.httpVersionMajor === 1 && isNaN(maxlen) && req.headers['transfer-encoding'] == null)
    || maxlen === 0
  ) return null;

  let length = maxlen;
  if (limit) {
    if (!length) {
      length = limit;
    } else if (length > limit) {
      throw getError(413, `received content-length of ${length}, limited to ${limit} bytes`);
    }
  }

  if (req.destroyed) {
    const readable = new ReadableStream();

    readable.cancel();
    return readable;
  }

  return getReadable(req, (size, controller) => {
    if (size > length) {
      controller.error(getError(413, `request body size exceeded limit of ${length} bytes`));
      return true;
    }
  });
}

export function getClientCode(conn, patch, baseURL, _uuid, _prefix) {
  const uuid = _uuid || conn.headers['request-uuid'] || `0.${Date.now().toString(36).replace(/.{3}/g, '$&-')}`;
  const state = JSON.stringify({ uuid, patch, csrf: conn.csrf_token, method: conn.method });
  const client = `<script>(${
    generateClientCode.toString().replace(/𝐢𝐦𝐩𝐨𝐫𝐭/g, 'import')
  })(${state}, ${JSON.stringify(_prefix)}, ${process.env.HEADLESS ? 'true' : 'undefined'});</script>
`.replaceAll('./', baseURL);

  return { uuid, client };
}

export async function createRequest(req, limit) {
  return new Request(`${req.protocol || 'http'}://${req.headers.host}${req.url}`, {
    duplex: 'half',
    method: req.method,
    headers: req.headers,
    body: getRawBody(req, limit),
  });
}

export function createError(e, env, client) {
  return `<pre>${e.stack.replace(/\((.+?)\)/gm, (_, x) => `<em data-location="${x}">${x}</em>`)}</pre>${client}`;
}

// FIXME: use a nice view for these... may be the default +error layout or so?
export function create404(env, conn, client, message) {
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });

  const style = `<style>
  dd { word-break: break-word }
  dt { font-weight: bold }
  dl + p, table + p, caption { text-transform: uppercase; background-color: rgba(0, 0, 0, .1); padding: .25rem }
  dl + p, table + p { margin-top: 2rem; text-align: center }
  dd + dt { margin-top: .5rem; position: relative }
  dd + dt::before { content: ''; position: absolute; width: 100%; border-top: 1px dashed rgba(0, 0, 0, .2); top: -.25rem }
</style>`;

  const config = `<p>Loaded config</p><dl>${Object.entries(Util.omit(env.options, ['generators']))
    .map(([k, v]) => `<dt>${k}</dt><dd>${typeof v === 'object' ? JSON.stringify(v) : v}</dd>`).join('')}</dl>`;

  const environment = `<p>Loaded env</p><dl>${Object.entries(conn.env)
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

  return `${style}${message}<table><caption>Available routes</caption>${env.routes.map(route => `
<tr><td align=right style="width:1%">${route.verb}</td><td>${
  route.verb === 'GET' ? `<a href="${route.path}">${route.path}</a>` : route.path
}</tr>`).join('')}
<tfoot><tr><th colspan="2">${conn.req.url} &mdash; ${now}</th></tr></tfoot>
</table>${config}${environment}${client}`;
}

export async function createBody(env, conn, clients, { uuid, client, matches, options }) {
  let status;
  let body;
  try {
    const ctx = {
      conn,
      clients,
      depth: 0,
      stack: [],
      called: true,
      route: matches,
      queue: env.queue,
      routes: env.routes,
    };

    ctx.uuid = uuid;

    conn.req.uuid = uuid;
    conn.req.params = matches.params;
    conn.current_path = matches.path;
    conn.routes = ctx.routes;

    if (Util.Is.func(ctx.clients) && !ctx.socket) {
      let _socket;
      Object.defineProperty(ctx, 'socket', {
        get: () => {
          // eslint-disable-next-line no-return-assign
          return _socket || (_socket = ctx.clients().find(x => x.identity === ctx.uuid));
        },
        set: v => {
          _socket = v;
        },
      });
    }

    let mod;
    if (matches.src) {
      conn.current_module = matches.src;
      mod = env.locate(conn.current_module);
    }

    if (matches.middleware) {
      conn.current_module = conn.current_module || matches.middleware;
      conn.current_options = { ...mod?.opts };

      const set = [matches.middleware].concat(matches.middlewares || []);
      const result = await Handler.middlewares(ctx, matches, set.map(env.locate));

      if (result) {
        return {
          status: conn.status_code,
          body: result,
        };
      }
    }

    if (!matches.src) {
      return {
        status: 404,
        body: create404(env, conn, client, 'Page not found'),
      };
    }

    if (!env.files[conn.current_module]) {
      return {
        status: 404,
        body: create404(env, conn, client, `Module not loaded, given '${conn.current_module}'`),
      };
    }

    ctx.route.layout = Util.Is.str(ctx.route.layout)
      ? env.locate(ctx.route.layout)
      : ctx.route.layout;

    ctx.route.error = Util.Is.str(ctx.route.error)
      ? env.locate(ctx.route.error)
      : ctx.route.error;

    const file = env.files[conn.current_module].filepath;

    if (!mod) {
      throw new Error(`Missing '${conn.current_module}' module`);
    }

    let props = {};
    if (mod.__exported?.length > 0) {
      props = Util.pick({ ...conn.req.fields, ...conn.req.params }, mod.__exported);

      Object.keys(conn.req.fields).forEach(key => {
        if (key.includes('.') && mod.__exported.includes(key.split('.')[0])) {
          Util.set(props, key, conn.req.fields[key]);
          delete conn.req.fields[key];
        }
      });
    }

    if (conn.method === 'POST' && conn.req.fields._method) {
      conn.method = conn.req.fields._method;
      delete conn.req.fields._method;
    }

    if (conn.headers['request-type'] === 'rpc') {
      if (conn.headers['request-call']) conn.req.fields._action = conn.headers['request-call'];
      if (conn.headers['request-from']) conn.req.fields._self = conn.headers['request-from'];
    }

    body = await Template.resolve(mod, file, ctx, props, Handler.middleware);

    if (body instanceof Response) {
      return { body, status: body.status };
    }

    if (!Util.Is.str(body)) {
      const state = [];
      const data = ctx.queue.get(uuid);
      const calls = Object.entries(body.actions)
        .reduce((memo, [_mod, _actions]) => {
          memo[_mod] = Object.keys(_actions);
          return memo;
        }, {});

      if (data) {
        Object.entries(data)
          .forEach(([k, v]) => state.push(`"${k}":${v}`));
      }

      if (conn.is_xhr) {
        body = Markup.encode(`{${[
          `"fragments":${JSON.stringify(body.fragments)}`,
          `"scripts":${JSON.stringify(body.scripts)}`,
          `"styles":${JSON.stringify(body.styles)}`,
          `"attrs":${JSON.stringify(body.attrs)}`,
          `"head":${JSON.stringify(body.head)}`,
          `"body":${JSON.stringify(body.body)}`,
          `"doc":${JSON.stringify(body.doc)}`,
          `"$":${JSON.stringify(calls)}`,
          `"_":{${state.join(',\n')}}`,
        ].join(',\n')}}`);

        const headers = new Headers({
          'content-type': 'application/json',
          'content-length': body.length,
        });

        return { body, headers, cookies: false, status: conn.status_code || 200 };
      }

      let buffer = [];
      Template.stringify(body, options.prefix, chunk => buffer.push(chunk));

      const payload = [
        `\n\t__defaults: {${state.join(',\n')}},`,
        `\n\t__scripts: ${JSON.stringify(body.scripts)},\n`,
        `\n\t__calls: ${JSON.stringify(calls)},\n`,
      ].join('');

      buffer.push(client.replace('this', `{${payload}}`));
      status = conn.status_code || 200;
      body = buffer.join('');
    }
  } catch (e) {
    console.log('E_STATUS', e);
    status = e.status || 500;
    body = createError(e, env, client);
  }
  return { body, status };
}

export async function createModuleResponse(env, conn) {
  const file = conn.path_info.slice(1).join('/');
  const src = Template.join(env.options.dest, file);

  let status = 404;
  let mod = `/* ${file} not found */`;
  if (Template.exists(src)) {
    mod = Template.read(src);
    status = 200;
  } else {
    const key = file.replace('.hooks.mjs', '.html');
    const _mod = await Template.reload(env.files[key].filepath);

    status = 200;
    mod = `/* ${file} */\n${Object.values(_mod.__functions).map(_ => `export ${_.toString()}\n`).join('')}`;
  }

  return [mod, status, null, new Headers({
    'content-type': file.includes('css') ? 'text/css' : 'application/javascript',
    'content-length': mod.length,
  })];
}

export async function createPageResponse(env, conn, clients, options) {
  const { uuid, client } = getClientCode(conn, env.version, conn.base_url, options.uuid, options.prefix);

  let matches;
  env.routes.some(route => {
    matches = Handler.match(conn, route, ['PATCH']);
    return matches;
  });

  // eslint-disable-next-line no-nested-ternary
  let status = matches ? 502 : conn.method === 'GET' ? 404 : 405;
  let cookies = null;
  let headers = null;
  let body = null;
  if (matches) {
    const result = await createBody(env, conn, clients, { uuid, client, matches, options });

    cookies = result.cookies || cookies;
    headers = result.headers || headers;
    status = result.status || status;
    body = result.body || body;
  }

  if (body === null) {
    body = create404(env, conn, client, `<p>Request to <b>${conn.method} ${conn.request_path}</b> not allowed.</p>`);
  }

  return [body, status, cookies === false ? null : conn.resp_cookies, headers || conn.resp_headers];
}

export async function createResponse(env, conn, clients, options) {
  if (conn.path_info[0] === options.prefix) {
    // FIXME: here we could validate paths!!
    if (conn.path_info.length > 1) {
      return createModuleResponse(env, conn);
    }

    let cancelled;
    return new Response(new ReadableStream({
      start(controller) {
        console.log('START SEE');

        function sendSSEMessage(data) {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        }

        const interval = setInterval(() => {
          if (cancelled) {
            clearInterval(interval);
          } else {
            sendSSEMessage('Hello, World!');
          }
        }, 1000);

        sendSSEMessage('READY');

        conn.req.signal.onabort = () => {
          clearInterval(interval);
          controller.close();
        };
      },
      cancel(reason) {
        cancelled = true;
        console.log('STOP SEE', reason);
      },
    }), {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
    });
  }
  return createPageResponse(env, conn, clients, options);
}

export function parseLocation(options) {
  let location = { port: options.port || +process.env.PORT || 8080 };
  if (Util.Is.str(options.bind)) {
    const parts = options.split(':');

    location = {
      host: parts.length === 2 ? parts[0] : undefined,
      port: parts.length === 2 ? parts[1] : parts[0],
    };
  }
  if (Util.Is.num(options.bind)) {
    location = { port: options.bind };
  }
  location.host = location.host || '0.0.0.0';
  return location;
}

export function finalResponse(result) {
  if (result instanceof Response) return result;

  const [body, status, cookies, headers] = result;

  if (headers) {
    headers.set('content-type', headers.get('content-type') || 'text/html');
    getCookies(Object.fromEntries(cookies || [])).forEach(cookie => headers.append('set-cookie', cookie));
  }

  return !(body instanceof Response) ? new Response(body, { status, headers }) : body;
}

export function serveFrom(dest, editor) {
  const files = Template.glob(`${dest}/*.js`).map(x => x.replace(`${dest}/`, ''));

  return req => {
    const path = req.url.split('/').slice(3).join('/');

    if (path.indexOf('__open?@=') === 0) {
      if (Util.Is.func(editor)) editor([decodeURIComponent(path.substr(9))]);
      return new Response(null, { status: 204 });
    }

    if (files.includes(path)) {
      const file = `${dest}/${path}`;

      const headers = {
        'content-type': 'application/javascript',
      };

      return new Response(Template.read(file), { headers });
    }
  };
}
