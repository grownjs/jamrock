/* global Bun */

import './runtime.js';

import * as path from 'node:path';
import { timingSafeEqual } from 'node:crypto';

import serveStaticBun from 'serve-static-bun';

import { Handler } from '../../dist/main.mjs';
import { createStore, createConnection, createRedisConnection, createResponse, parseLocation, finalResponse, serveFrom } from '../../dist/server.mjs';

const DIST_DIR = path.resolve(import.meta.url.replace('file://', ''), '../../../dist');

export async function createHandler(env, options = {}) {
  const serveFile = serveStaticBun(options.public || 'public');
  const store = await createStore({
    encode: (v, s) => Buffer.from(Bun.SHA1.hash(s + v)).toString('base64'),
    compare: (a, b) => a && b && timingSafeEqual(Buffer.from(a), Buffer.from(b)),
  }, options);

  let sync;
  if (options.watch) {
    sync = env.watcher;
  }

  const call = async (request, clients, teardown) => {
    let resp = await serveFile(request);
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

export async function createServer(env, options) {
  await createRedisConnection(env, options, () => import('redis'));

  const handler = await createHandler(env, options);
  const editor = files => Bun.openInEditor(files[0]);
  const resolve = serveFrom(DIST_DIR, editor);
  const location = parseLocation(options);
  const clients = [];

  const events = {
    open: () => null,
    close: () => null,
  };

  const server = Bun.serve({
    ...location,
    websocket: {
      maxPayloadLength: 16 * 1024 * 1024,
      compression: 0,
      idleTimeout: 8,
      open(ws) {
        const _events = {
          error: () => null,
          message: () => null,
          request: () => null,
          disconnect: () => null,
        };

        clients.push(Object.assign(ws, {
          on: (e, cb) => { _events[e] = cb; },
          emit: (e, ...args) => { _events[e](...args); },
        }));
        events.open(ws);
      },
      message(ws, data) {
        ws.emit('message', data);
      },
      close(ws) {
        const idx = clients.indexOf(ws);

        events.close(ws);
        clients.splice(idx, 1);
      },
    },
    fetch: async (req, _server) => {
      if (_server.upgrade(req)) return;
      if (handler.sync) await handler.sync.rebuild(req);
      return resolve(req) || finalResponse(await handler.call(req, () => clients, () => _server.stop()));
    },
  });

  Handler.setup({
    on: (e, cb) => { events[e] = cb; },
  }, editor, handler.sync, options.timeout || 300);

  console.log(`Listening on ${server.protocol}//${server.hostname}:${server.port}`);
}
