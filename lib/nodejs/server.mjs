import './runtime.mjs';

import * as path from 'path';
import { STATUS_CODES } from 'http';

import createContainer from 'grown';
import editor from 'open-editor';
import { createHash, timingSafeEqual } from 'crypto';

import { Template, Util } from '../../dist/main.mjs';

import {
  createStore, createSession, createConnection, extendConnection, createRedisConnection, createRequest, createResponse,
  parseLocation, parseCookies, getCookies, serveFrom,
} from '../../dist/server.mjs';

const DIST_DIR = path.resolve(import.meta.url.replace('file://', ''), '../../../dist');

export async function createHandler(env, options) {
  const location = parseLocation(options);
  const store = await createStore({
    encode: (v, s) => createHash('sha1').update(s + v, 'ascii').digest('base64'),
    compare: (a, b) => a && b && timingSafeEqual(Buffer.from(a), Buffer.from(b)),
  }, options);

  let sync;
  if (options.watch) {
    sync = env.watcher;
  }

  const call = async (request, teardown) => {
    const cookiesObj = parseCookies(request.headers.get('cookie') || '');
    const cookies = new Map(Object.entries(cookiesObj));
    const session = await createSession(store, cookies.get('sid') || '$');
    const server = { protocol: location.protocol, hostname: location.hostname, port: location.port, teardown };
    const conn = extendConnection(createConnection(request, server, options), { store, session, cookies });
    const resp = await createResponse(env, conn, options);

    await store.write(conn.req.sid, conn.session);
    return resp;
  };

  return {
    handler: { call, sync },
    location,
  };
}

export async function createServer(env, options) {
  await createRedisConnection(env, options, () => import('redis'));

  const { handler, location } = await createHandler(env, options);
  const resolve = serveFrom(env, DIST_DIR, editor);
  const Grown = createContainer();

  Grown.use(import('@grown/static'));
  Grown.ready(() => {
    const app = new Grown({ ...options, parse: false });

    app.plug([
      Grown.Static({
        from_folders: [
          options.public || 'public',
        ],
      }),
    ]);
    app.mount(async conn => {
      if (handler.sync) await handler.sync.rebuild(conn.req);

      const req = createRequest(conn.req);

      let resp = resolve(req);
      if (resp) {
        conn.res.setHeader('content-type', resp.headers.get('content-type'));
        conn.res.statusMessage = STATUS_CODES[resp.status];
        conn.res.statusCode = resp.status;
      } else {
        resp = await handler.call(req, app.close);

        let body;
        let status;
        let cookies;
        let _headers;
        if (resp instanceof Response) {
          body = resp;
          status = resp.status;
          _headers = resp.headers;
        } else {
          ({ body, status, cookies, headers: _headers } = resp);
        }

        if (_headers) _headers.forEach((value, key) => conn.res.setHeader(key, value));

        conn.res.setHeader('content-type', conn.res.getHeader('content-type') || 'text/html');

        if (cookies !== false) {
          getCookies(Object.fromEntries(cookies || []))
            .forEach(cookie => conn.res.setHeader('set-cookie', cookie));
        }

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
          const err = error instanceof Error ? error : new Error(String(error));
          Util.trace(err, 'E_PEEK');
          cancel(err);
        }
      }
      return peek();
    });
    let config;
    if (options.https) {
      config = {
        key: Template.read(process.env.SSL_KEY_FILE),
        cert: Template.read(process.env.SSL_CRT_FILE),
      };
    }
    app.listen({
      port: location.port,
      host: location.hostname,
      protocol: location.protocol,
    }, config).then(server => {
      if (!options.quiet) {
        console.log(`Listening on ${server.location.protocol}//${server.location.hostname}:${server.location.port}`);
      }
    });
  });
}
