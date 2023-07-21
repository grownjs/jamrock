import './runtime.mjs';

import * as path from 'path';
import { STATUS_CODES } from 'http';

import createContainer from 'grown';
import editor from 'open-editor';
import { createHash, timingSafeEqual } from 'crypto';

import { Handler } from '../../dist/main.mjs';
// eslint-disable-next-line max-len
import { createStore, createConnection, createRedisConnection, createRequest, createResponse, parseLocation, getCookies, serveFrom } from '../../dist/server.mjs';

const DIST_DIR = path.resolve(import.meta.url.replace('file://', ''), '../../../dist');

export async function createHandler(env, options = {}) {
  const store = await createStore({
    encode: (v, s) => createHash('sha1').update(s + v, 'ascii').digest('base64'),
    compare: (a, b) => a && b && timingSafeEqual(Buffer.from(a), Buffer.from(b)),
  }, options);

  let sync;
  if (options.watch) {
    sync = env.watcher;
  }

  const call = async (request, clients, teardown) => {
    const conn = await createConnection(store, options, request, teardown);
    const resp = await createResponse(env, conn, clients, options);

    // if (resp[3]) resp[3].set('x-csrf', conn.csrf_token);
    await store.write(conn.req.sid, conn.session);
    return resp;
  };

  return { call, sync };
}

export async function createServer(env, options) {
  await createRedisConnection(env, options, () => import('redis'));

  const handler = await createHandler(env, options);
  const resolve = serveFrom(DIST_DIR, editor);
  const location = parseLocation(options);
  const Grown = createContainer();

  Grown.use(import('@grown/static'));
  Grown.ready(() => {
    const app = new Grown({ ...options, parse: false });

    Handler.setup(app, env, editor, handler, options.timeout || 300);

    app.plug([
      Grown.Static({
        from_folders: [
          options.public || 'public',
        ],
      }),
    ]);
    app.mount(async conn => {
      if (handler.sync) await handler.sync.rebuild(conn.req);

      const req = await createRequest(conn.req);

      let resp = resolve(req);
      if (resp) {
        conn.res.setHeader('content-type', resp.headers.get('content-type'));
        conn.res.statusMessage = STATUS_CODES[resp.status];
        conn.res.statusCode = resp.status;
      } else {
        const [body, status, cookies, _headers] = await handler.call(req, app.clients, app.close);

        if (_headers) _headers.forEach((value, key) => conn.res.setHeader(key, value));
        conn.res.setHeader('content-type', conn.res.getHeader('content-type') || 'text/html');
        conn.res.setHeader('set-cookie', getCookies(Object.fromEntries(cookies || [])));
        conn.res.statusMessage = STATUS_CODES[status];
        conn.res.statusCode = status;

        if (!body) {
          conn.res.end();
          return;
        }

        resp = body;
      }

      let reader;
      if (!(resp instanceof Response)) {
        if (resp instanceof ReadableStream) {
          reader = resp.getReader();
        } else {
          conn.res.send(resp);
          conn.res.end();
          return;
        }
      }

      if (!reader) {
        if (resp.body === null) {
          conn.res.end();
          return;
        }

        if (resp.body.pipe) {
          resp.body.on('data', chunk => conn.res.write(chunk));
          return new Promise(ok => resp.body.on('end', ok));
        }

        reader = resp.body.getReader();
      }

      if (conn.res.destroyed) {
        reader.cancel();
        return;
      }

      const cancel = err => {
        conn.res.off('close', cancel);
        conn.res.off('error', cancel);
        reader.cancel(err).catch(() => {});
        if (err) conn.res.destroy(err);
      };

      conn.res.on('close', cancel);
      conn.res.on('error', cancel);

      async function peek() {
        try {
          for (;;) {
            const { done, value } = await reader.read();

            if (done) break;
            if (!conn.res.write(value)) {
              conn.res.once('drain', peek);
              return;
            }
          }
          conn.res.end();
        } catch (error) {
          cancel(error instanceof Error ? error : new Error(String(error)));
        }
      }
      return peek();
    });
    app.listen(location).then(server => {
      console.log(`Listening on ${server.location.protocol}//${server.location.host}`);
    });
  });
}
