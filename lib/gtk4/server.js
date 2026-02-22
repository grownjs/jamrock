import { printLog } from './runtime.js';

import { serverResponse, serveStaticFiles, GLib, Soup } from './deps.js';
import { wrapSoupWebSocket } from './websocket.js';

import { Handler } from '../../dist/main.mjs';
import {
  createStore, createSession, createConnection, createResponse, parseLocation, parseCookies, finalResponse, serveFrom
} from '../../dist/server.mjs';

const DIST_DIR = `${import.meta.url.replace('file://', '').replace(/(\/[^/]+){3}$/, '')}/dist`;

let _serverInstance;
function createSoupServer(location, callback, clients, events) {
  function handler(_server, msg, _path, _query) {
    msg.pause();

    const params = {
      url: msg.get_uri().get_path(),
      method: msg.get_method(),
      body: null,
      headers: {},
    };
    const req = new Request(`http://${location.hostname}${params.url || '/'}`, {
      duplex: 'half',
      uuid: 'test-id',
      body: params.body,
      fields: {},
      method: params.method || 'GET',
      headers: { ...location, ...params.headers },
    });

    callback(req, _server)
      .then(resp => {
        if (resp instanceof Response) {
          serverResponse(msg, resp);
        } else {
          serverResponse(msg, new Response('Not Implemented'));
        }
      })
      .catch(err => {
        serverResponse(msg, new Response(err?.message || 'Error', { status: 500 }));
      });
  }

  function websocketHandler(_server, connection, _path) {
    const ws = wrapSoupWebSocket(connection, clients, events);
    clients.push(ws);
    events.open(ws);
  }

  _serverInstance = new Soup.Server();
  _serverInstance.add_handler('/', handler);
  _serverInstance.add_websocket_handler('/rpc', null, null, websocketHandler);
  _serverInstance.listen_all(location.port, Soup.ServerListenOptions.IPV4_ONLY);
  function stop() {
    console.log('STOP', _serverInstance);
  }
  return {
    protocol: location.protocol,
    hostname: location.hostname,
    port: location.port,
    stop,
  };
}

export async function createHandler(env, options) {
  const serveFile = serveStaticFiles(options.public || 'public');
  const location = parseLocation(options);
  const store = await createStore({
    encode: async (v, s) => {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', s, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(v));
      return btoa(String.fromCharCode(...new Uint8Array(sig)));
    },
    compare: (a, b) => a != null && b != null && a === b,
  }, options);

  let sync;
  if (options.watch) {
    sync = env.watcher;
  }

  const call = async (req, clients, teardown) => {
    req.headers = new Headers(req.headers);

    let resp = serveFile(req);
    if (!resp) {
      const cookies = parseCookies(req.headers.cookie || '');
      const session = await createSession(store, cookies.sid || '$');
      const conn = createConnection(store, session, cookies, options, req, location, teardown);

      resp = await createResponse(env, conn, clients, options);
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
  const loop = GLib.MainLoop.new(null, false);

  const { handler, location } = await createHandler(env, options);
  const editor = files => GLib.spawn_command_line_async(`${process.env.EDITOR || 'xdg-open'} "${files[0]}"`);
  const resolve = serveFrom(env, DIST_DIR, editor);
  const clients = [];

  const events = {
    open: () => null,
    close: () => null,
  };

  const server = createSoupServer(location, async (req, _server) => {
    return resolve(req) || finalResponse(await handler.call(req, () => clients, () => _server.stop()));
  }, clients, events);

  Handler.setup({
    on: (e, cb) => { events[e] = cb; },
  }, env, editor, handler, options.timeout || 300);

  if (!options.quiet) {
    printLog(`Listening on ${server.protocol}://${server.hostname}:${server.port}`);
  }

  loop.run()
}
