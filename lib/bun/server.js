/* global Bun */

import './runtime.js';

import * as path from 'node:path';
import { timingSafeEqual } from 'node:crypto';

import serveStaticBun from 'serve-static-bun';

import {
  createStore, createSession, createConnection, createRedisConnection, createResponse, parseLocation, parseCookies, finalResponse, serveFrom,
} from '../../dist/server.mjs';

const DIST_DIR = path.resolve(import.meta.url.replace('file://', ''), '../../../dist');

export async function createHandler(env, options) {
  const serveFile = serveStaticBun(options.public || 'public');
  const location = parseLocation(options);
  const store = await createStore({
    encode: (v, s) => Buffer.from(Bun.SHA1.hash(s + v)).toString('base64'),
    compare: (a, b) => a && b && timingSafeEqual(Buffer.from(a), Buffer.from(b)),
  }, options);

  let sync;
  if (options.watch) {
    sync = env.watcher;
  }

  const call = async (request, teardown) => {
    let resp = await serveFile(request);
    if (!resp.ok) {
      const cookies = parseCookies(request.headers.get('cookie') || '');
      const session = await createSession(store, cookies.sid || '$');
      const conn = createConnection(store, session, cookies, options, request, location, teardown);

      resp = await createResponse(env, conn, options);
      await store.write(conn.req.sid, conn.session);
    }
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
  const editor = files => Bun.openInEditor(files[0]);
  const resolve = serveFrom(env, DIST_DIR, editor);

  if (options.https) {
    location.tls = {
      key: Bun.file(process.env.SSL_KEY_FILE),
      cert: Bun.file(process.env.SSL_CRT_FILE),
    };
  }

  const server = Bun.serve({
    ...location,
    fetch: async (req, _server) => {
      if (handler.sync) await handler.sync.rebuild(req);
      return resolve(req) || finalResponse(await handler.call(req, () => _server.stop()));
    },
  });

  if (!options.quiet) {
    console.log(`Listening on ${server.protocol}://${server.hostname}:${server.port}`);
  }
}
