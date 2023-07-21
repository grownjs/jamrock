import './runtime.js';

import { path, editor, staticFiles, createHash, timingSafeEqual } from './deps.js';

import { Handler } from '../../dist/main.mjs';
import { createStore, createConnection, createRedisConnection, createResponse, parseLocation, finalResponse, serveFrom } from '../../dist/server.mjs';

const DIST_DIR = path.resolve(import.meta.url.replace('file://', ''), '../../../dist');

export async function createHandler(env, options = {}) {
  const serveFile = staticFiles(options.public || 'public');
  const store = await createStore({
    encode: (v, s) => createHash('sha1').update(s + v, 'ascii').digest('base64'),
    compare: (a, b) => a && b && timingSafeEqual(Buffer.from(a), Buffer.from(b)),
  }, options);

  let sync;
  if (options.watch) {
    sync = env.watcher;
  }

  const call = async (request, clients, teardown) => {
    let resp = await serveFile({ request, respondWith: r => r });
    if (!resp.ok) {
      const conn = await createConnection(store, options, request, teardown);

      resp = await createResponse(env, conn, clients, options);
      await store.write(conn.req.sid, conn.session);
      // if (resp[3]) resp[3].set('x-csrf', conn.csrf_token);
    }
    return resp;
  };

  return { call, sync };
}

/* global Deno */
export async function createServer(env, options) {
  await createRedisConnection(env, options, () => import('npm:redis'));

  const handler = await createHandler(env, options);
  const resolve = serveFrom(DIST_DIR, editor);
  const location = parseLocation(options);
  const server = Deno.listen(location);
  const clients = [];

  const events = {
    open: () => null,
    close: () => null,
  };

  console.debug(`Listening on http://${location.host || 'localhost'}:${location.port}/`);

  async function handleReq(req) {
    const upgrade = req.headers.get('upgrade') || '';

    if (upgrade.toLowerCase() === 'websocket') {
      const { socket, response } = Deno.upgradeWebSocket(req);

      socket.onopen = () => {
        const _events = {
          error: () => null,
          message: () => null,
          request: () => null,
          disconnect: () => null,
        };

        clients.push(Object.assign(socket, {
          on: (e, cb) => { _events[e] = cb; },
          emit: (e, ...args) => { _events[e](...args); },
        }));
        events.open(socket);
      };
      socket.onmessage = e => {
        socket.emit('message', e.data);
      };
      socket.onerror = e => {
        socket.emit('error', e);
      };
      socket.onclose = () => {
        const idx = clients.indexOf(socket);

        events.close(socket);
        clients.splice(idx, 1);
      };
      return response;
    }

    if (handler.sync) await handler.sync.rebuild(req);
    return resolve(req) || finalResponse(await handler.call(req, () => clients, () => server.close()));
  }

  async function serveHttp(conn) {
    const httpConn = Deno.serveHttp(conn);

    for await (const requestEvent of httpConn) {
      const response = await handleReq(requestEvent.request);

      requestEvent.respondWith(response).catch(e => {
        if (!e.message.includes('connection closed') && e.name !== 'BadResource') console.error('E_HTTP', e);
      });
    }
  }

  Handler.setup({
    on: (e, cb) => { events[e] = cb; },
  }, env, editor, handler, options.timeout || 300);

  (async () => {
    for await (const conn of server) serveHttp(conn);
  })();
}
