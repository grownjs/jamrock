import { Template, Markup, Handler, Util } from '../main.ts';
import type { SSESocket } from '../handler/dispatch.ts';

import { generateClientCode } from '../client.js';

export function parseCookies(cookie: string): Record<string, string> {
  if (!cookie) return {};

  const pairs = cookie.split(/;\s*/g);
  const cookies: Record<string, string> = {};

  for (let i = 0, len = pairs.length; i < len; i++) {
    const [k, v] = pairs[i].split(/\s*=\s*([^\s]+)/);

    cookies[k] = decodeURIComponent(v);
  }
  return cookies;
}

export function buildCookie(name: string, value: string, options: any = {}): string {
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

export function getCookies(obj: Record<string, any>): string[] {
  const result: string[] = [];

  return Object.keys(obj).reduce((memo, cur) => {
    return memo.concat(obj[cur]
      ? buildCookie(cur, obj[cur].value, obj[cur].options)
      : []);
  }, result);
}

export function getError(code: number, message: string): never {
  const e: any = new Error(message);

  throw Object.assign(e, {
    status: code,
  });
}

export function getReadable(stream: any, callback?: any): ReadableStream {
  let size = 0;
  let cancelled = false;
  return new ReadableStream({
    start(controller) {
      stream.on('error', (err: any) => {
        cancelled = true;
        controller.error(err);
      });

      stream.on('end', () => {
        if (cancelled) return;
        controller.close();
      });

      stream.on('data', (chunk: any) => {
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

export function getRawBody(req: any, limit?: number): ReadableStream | null {
  if (!req.headers['content-type'] || (req.method && ['GET', 'HEAD'].includes(req.method))) return null;

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

  return getReadable(req, (size: number, controller: ReadableStreamDefaultController) => {
    if (size > length) {
      controller.error(getError(413, `request body size exceeded limit of ${length} bytes`));
      return true;
    }
  });
}

export function getClientCode(conn: any, patch: string, baseURL: string, prefixURL: string): string {
  if (process.env.HEADLESS) {
    return '';
  }

  const { uuid, method } = conn.req;
  const state = JSON.stringify({ uuid, patch, method, csrf: conn.csrf_token });
  const shim = '<script>window.__f=(r,d,m)=>(window.__fq=window.__fq||[]).push([r,d,m]);</script>';
  const client = `${shim}<script defer>(${generateClientCode.toString().replace(/𝐢𝐦𝐩𝐨𝐫𝐭/g, 'import')
  })(${state}, ${JSON.stringify(prefixURL)});</script>
`.replaceAll('./', baseURL);

  return client;
}

// eslint-disable-next-line no-unused-vars
export function injectClientResponse(response: Response, client: string, onReady?: (controller: ReadableStreamDefaultController) => void): Response {
  if (!client) return response;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  if (!response.body) return response;

  const encoder = new TextEncoder();
  const reader = response.body.getReader();

  const stream = new ReadableStream({
    start(controller) {
      const pump = (): void => {
        reader.read().then(({ done, value }) => {
          if (done) {
            controller.enqueue(encoder.encode(client));
            if (onReady) {
              onReady(controller);
            } else {
              controller.close();
            }
            return;
          }
          controller.enqueue(value);
          pump();
        }).catch((error: any) => controller.error(error));
      };

      pump();
    },
    cancel(reason) {
      reader.cancel?.(reason);
    },
  });

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createRequest(req: any, limit?: number): Request {
  return new Request(`${req.protocol || 'http'}://${req.headers.host}${req.url}`, {
    // @ts-expect-error
    duplex: 'half',
    method: req.method,
    headers: req.headers,
    body: getRawBody(req, limit),
  });
}

export function createError(e: any, client: string): string {
  return `<pre>${e.stack?.replace(/\((.+?)\)/gm, (_: string, x: string) => `<em data-location="${x}">${x}</em>`)}</pre>${client}`;
}

export function create404(env: any, conn: any, client: string, message: string): string {
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
    .map(([k, v]: [string, any]) => `<dt>${k}</dt><dd>${typeof v === 'object' ? JSON.stringify(v) : v}</dd>`).join('')}</dl>`;

  const environment = `<p>Loaded env</p><dl>${Object.entries(process.env)
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

  return `${style}${message}<table><caption>${env.routes.length > 0 ? 'A' : 'No a'}vailable routes</caption>${env.routes.map((route: any) => `
<tr><td align=right style="width:1%">${route.verb}</td><td>${
  route.verb === 'GET' ? `<a href="${route.path}">${route.path}</a>` : route.path}</tr>`).join('')}
<tfoot><tr><th colspan="2">${conn.req.url} &mdash; ${now}</th></tr></tfoot>
</table>${config}${environment}${client}`;
}

export async function createBody(env: any, conn: any, { client, matches, options }: any): Promise<any> {
  let status;
  let body;
  const encoder = new TextEncoder();
  try {
    const ctx: any = {
      conn,
      depth: 0,
      stack: [],
      ready: null,
      socket: null,
      stream: null,
      streamController: null,
      called: true,
      route: matches,
      cache: env.cache,
      routes: env.routes,
      publish: async (ref: string, key: string, item: any, mode: string, render: any) => {
        const { target, vnode } = await render(key, item);
        const payload = JSON.stringify(vnode);

        if (ctx.socket) {
          ctx.socket.send(`rpc:update ${ctx.socket.identity} ${target} ${mode}\t${Markup.encode(payload)}`);
        } else if (ctx.streamController) {
          // eslint-disable-next-line no-nested-ternary
          const modeArg = mode === 'replace' ? '0' : mode === 'append' ? '1' : '-1';
          const chunk = `<script>__f(${JSON.stringify(target)},${payload},${modeArg})</script>`;
          ctx.streamController.enqueue(encoder.encode(chunk));
        } else {
          Util.dump('__OUTPUT', conn.req.uuid, ref, mode, target, payload);
        }
      },
    };

    ctx.stream = env.context?.wrap(ctx, conn.req.uuid);

    conn.req.params = matches.params;
    conn.current_path = matches.path;

    conn.routes = ctx.routes || [];

    let mod;
    if (matches.src) {
      conn.current_module = matches.src;
      mod = env.locate(conn.current_module);
    }

    if (matches.middleware) {
      conn.current_module = conn.current_module || matches.middleware;
      conn.current_options = { ...mod?.opts };

      const _set = [matches.middleware].concat(matches.middlewares || []);
      const result = await Handler.middlewares(ctx, matches, _set.map(env.locate));

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

    let props: any = {};
    if (mod.__exported?.length > 0) {
      props = Util.pick({ ...conn.req.fields, ...conn.req.params }, mod.__exported);

      Object.keys(conn.req.fields).forEach((key: string) => {
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
      return body;
    }

    if (!Util.Is.str(body)) {
      const state: string[] = [];

      const data = await ctx.cache?.get(conn.req.uuid);

      const calls = Object.entries(body.actions)
        .reduce((memo: any, [_mod, _actions]: [string, any]) => {
          memo[_mod] = Object.keys(_actions);
          return memo;
        }, {});

      if (data) {
        Object.entries(data)
          .forEach(([k, v]: [string, any]) => state.push(`"${k}":${JSON.stringify(v)}`));
      }

      if (conn.is_json) {
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
        });

        return { body, headers, status: conn.status_code };
      }

      let buffer: string[] = [];
      Template.stringify(body, options.prefix, (chunk: string) => buffer.push(chunk));

      const payload = [
        `\n\t__defaults: {${state.join(',\n')}},`,
        `\n\t__scripts: ${JSON.stringify(body.scripts)},\n`,
        `\n\t__calls: ${JSON.stringify(calls)},\n`,
      ].join('');

      buffer.push(client.replace('this', `{${payload}}`));
      status = conn.status_code;
      body = buffer.join('');

      const hasPendingStreams = ctx.stream && ctx.stream.size > 0 && !ctx.socket;

      if (hasPendingStreams) {
        const initialBody = body;
        const headers = new Headers({ 'content-type': 'text/html' });
        headers.delete('content-length');

        const response = new Response(new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(initialBody));

            ctx.streamController = controller;

            const checkDone = () => {
              if (ctx.stream.size === 0) {
                controller.close();
              }
            };

            ctx.stream.forEach((entry: any, key: string) => {
              const originalCancel = entry.cancel;
              entry.cancel = () => {
                originalCancel();
                ctx.stream.delete(key);
                checkDone();
              };
            });

            setTimeout(checkDone, 0);
          },
          cancel() {
            ctx.stream.forEach((entry: any) => entry.cancel());
          },
        }), { status, headers });
        (response as any).__streaming = true;
        return response;
      }
    }
  } catch (e: any) {
    Util.trace('E_STATUS', e);
    status = e.status || 500;
    body = createError(e, client);
  }
  return { body, status };
}

export async function createModuleResponse(env: any, conn: any): Promise<any> {
  const file = conn.path_info.slice(1).join('/');
  const src = Template.join(env.options.dest, file);

  let status = 404;
  let body: string = `/* ${file} not found */`;
  if (Template.exists(src)) {
    body = Template.read(src);
    status = 200;
  } else {
    const _mkd = file.replace('.hooks.mjs', '.md');
    const _html = file.replace('.hooks.mjs', '.html');
    const _file = env.files[_mkd] || env.files[_html];

    if (_file) {
      const _mod = await Template.reload(_file.filepath);

      status = 200;
      body = `/* ${file} */\n${Object.values(_mod.__functions).map((_: any) => `export ${_.toString()}\n`).join('')}`;
    }
  }

  return {
    body,
    status,
    headers: new Headers({
      'content-type': file.includes('css') ? 'text/css' : 'application/javascript',
      'content-length': body.length.toString(),
    }),
  };
}

export function getResponsePrelude(env: any, conn: any, options: any): any {
  const client = getClientCode(conn, env.version, conn.base_url, options.prefix);

  let matches: any;
  env.routes.some((route: any) => {
    matches = Handler.match(conn, route, ['PATCH']);
    return matches;
  });

  // eslint-disable-next-line no-nested-ternary
  const status = matches ? 502 : conn.method === 'GET' ? 404 : 405;
  return { status, client, matches };
}

export function defaultResponse(env: any, conn: any, client: string, { body, status, headers, cookies }: any): any {
  if (body === null) {
    body = create404(env, conn, client, `<p>Request to <b>${conn.method} ${conn.request_path}</b> not allowed.</p>`);
  }

  return {
    body,
    status,
    cookies: cookies || conn.resp_cookies,
    headers: headers || conn.resp_headers,
  };
}

export async function createPageResponse(env: any, conn: any, options: any): Promise<any> {
  let { status, client, matches } = getResponsePrelude(env, conn, options);

  let headers = null;
  let body = null;
  let cookies;
  if (matches) {
    const result = await createBody(env, conn, { client, matches, options });

    if (result instanceof Response) {
      if ((result as any).__streaming) return result;
      return injectClientResponse(result, client);
    }

    cookies = result.cookies || cookies || undefined;
    headers = result.headers || headers;
    status = result.status || status;
    body = result.body || body;
  }

  return defaultResponse(env, conn, client, { body, status, headers, cookies });
}

function createSSEResponse(env: any, conn: any): Response {
  const uuid = conn.req.uuid;
  const encoder = new TextEncoder();

  return new Response(new ReadableStream({
    start(controller) {
      Util.dump('START SSE', uuid);

      const sseSocket: SSESocket = {
        identity: uuid,
        send: (msg: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        },
      };

      if (!env.sseSockets) {
        env.sseSockets = new Map();
      }
      env.sseSockets.set(uuid, sseSocket);

      sseSocket.send(`welcome ${uuid}`);

      conn.req.signal.onabort = () => {
        env.sseSockets?.delete(uuid);
        controller.close();
      };
    },
    cancel(reason) {
      Util.dump('STOP SSE', reason, uuid);
      env.sseSockets?.delete(uuid);
      env.context.get(uuid)?.forEach((s: any) => s.cancel());
      env.context.delete(uuid);
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

async function createRpcResponse(env: any, conn: any): Promise<Response> {
  if (conn.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await conn.req.formData();
    const payload = formData.get('cmd');

    if (typeof payload !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing cmd field' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const uuid = conn.req.uuid;
    const sseSocket = env.sseSockets?.get(uuid);

    if (!sseSocket) {
      return new Response(JSON.stringify({ error: 'No SSE connection found' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const result = Handler.dispatch(payload, sseSocket, env, null);

    if (result && result.welcome) {
      sseSocket.send(result.welcome);
    } else if (result && result.dispose) {
      env.sseSockets?.delete(uuid);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    Util.trace('E_RPC', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function createResponse(env: any, conn: any, options: any): Promise<any> {
  if (conn.path_info[0] === options.prefix) {
    if (conn.path_info.length > 1) {
      if (conn.path_info[1] === 'rpc') {
        return createRpcResponse(env, conn);
      }
      return createModuleResponse(env, conn);
    }

    return createSSEResponse(env, conn);
  }
  return createPageResponse(env, conn, options);
}

export function createBodySync(env: any, conn: any, { client, matches, options }: any): any {
  let status;
  let body;
  try {
    const ctx: any = {
      conn,
      depth: 0,
      stack: [],
      ready: null,
      called: true,
      route: matches,
      cache: env.cache,
      routes: env.routes,
    };

    conn.routes = ctx.routes || [];
    conn.req.params = matches.params;
    conn.current_path = matches.path;

    let mod;
    if (matches.src) {
      conn.current_module = matches.src;
      mod = env.locate(conn.current_module);
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

    let props: any = {};
    if (mod.__exported?.length > 0) {
      props = Util.pick({ ...conn.req.fields, ...conn.req.params }, mod.__exported);

      Object.keys(conn.req.fields).forEach((key: string) => {
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

    body = Template.resolveSync(mod, file, ctx, props, Handler.middleware);

    if (body instanceof Response) {
      return body;
    }

    if (!Util.Is.str(body)) {
      if (conn.is_json) {
        body = Markup.encode(`{${[
          `"fragments":${JSON.stringify(body.fragments)}`,
          `"scripts":${JSON.stringify(body.scripts)}`,
          `"styles":${JSON.stringify(body.styles)}`,
          `"attrs":${JSON.stringify(body.attrs)}`,
          `"head":${JSON.stringify(body.head)}`,
          `"body":${JSON.stringify(body.body)}`,
          `"doc":${JSON.stringify(body.doc)}`,
        ].join(',\n')}}`);

        const headers = new Headers({
          'content-type': 'application/json',
        });

        return { body, headers, status: conn.status_code };
      }

      let buffer: string[] = [];
      Template.stringify(body, options.prefix, (chunk: string) => buffer.push(chunk));

      const payload = [
        `\n\t__scripts: ${JSON.stringify(body.scripts)},\n`,
      ].join('');

      buffer.push(client.replace('this', `{${payload}}`));
      status = conn.status_code;
      body = buffer.join('');
    }
  } catch (e: any) {
    Util.trace('E_STATUS', e);
    status = e.status || 500;
    body = createError(e, client);
  }
  return { body, status };
}

export function createResponseSync(env: any, conn: any, options: any): any {
  let { status, client, matches } = getResponsePrelude(env, conn, options);

  let headers = null;
  let body = null;
  let cookies;
  if (matches) {
    const result = createBodySync(env, conn, { client, matches, options });

    if (result instanceof Response) {
      return injectClientResponse(result, client);
    }

    cookies = result.cookies || cookies || undefined;
    headers = result.headers || headers;
    status = result.status || status;
    body = result.body || body;
  }

  return defaultResponse(env, conn, client, { body, status, headers, cookies });
}

export function parseLocation(options: any): any {
  return {
    protocol: options.https ? 'https' : 'http',
    hostname: options.host || '0.0.0.0',
    port: options.port || +(process.env.PORT || 8080),
  };
}

export function finalResponse(result: any): Response {
  if (result instanceof Response) return result;

  const { body, status, cookies, headers } = result;

  if (headers) {
    headers.set('content-type', headers.get('content-type') || 'text/html');
    if (cookies) {
      getCookies(Object.fromEntries(cookies))
        .forEach((cookie: string) => headers.append('set-cookie', cookie));
    }
  }

  return !(body instanceof Response) ? new Response(body, { status, headers }) : body;
}

export function serveFrom(env: any, dest: string, editor: any): any {
  const files = Template.glob(`${dest}/*.{js,css}`).map(x => x.replace(`${dest}/`, ''));

  return (req: any) => {
    const path = req.url.split('?')[0].split('/').slice(3).join('/') || '/';

    if (path.indexOf('__open?@=') === 0) {
      if (Util.Is.func(editor)) editor([decodeURIComponent(path.substr(9))]);
      return new Response(null, { status: 204 });
    }

    if (env.options.src) {
      const asset = Template.join(env.options.src, path);

      if (env.assets.includes(asset)) {
        const headers = {
          'content-type': Util.mimeType(asset),
        };

        return new Response(Template.read(asset), { headers });
      }
    }

    if (path.charAt(0) === env.options.prefix) {
      const src = path.substr(1);

      if (env.assets.includes(src)) {
        const headers = {
          'content-type': Util.mimeType(src),
        };

        return new Response(Template.read(src), { headers });
      }
    }

    if (files.includes(path)) {
      const headers = {
        'content-type': Util.mimeType(path),
      };

      return new Response(Template.read(`${dest}/${path}`), { headers });
    }
  };
}
