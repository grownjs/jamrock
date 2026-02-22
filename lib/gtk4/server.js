import { printLog } from './runtime.js';

import { serverResponse, serveStaticFiles, GLib, Soup } from './deps.js';
import { wrapSoupWebSocket } from './websocket.js';

import { Handler } from '../../dist/main.mjs';
import {
  createStore, createSessionSync, createConnection, createResponseSync, parseLocation, parseCookies, finalResponse, serveFrom
} from '../../dist/server.mjs';

const DIST_DIR = `${import.meta.url.replace('file://', '').replace(/(\/[^/]+){3}$/, '')}/dist`;

let _serverInstance;
export function createSoupServer(location, callback, clients, events) {
  function handler(_server, msg, _path, _query) {
    msg.pause();

    const headers = {};
    msg.get_request_headers().foreach((name, value) => {
      headers[name.toLowerCase()] = value;
    });

    const requestBody = msg.get_request_body();
    let body = null;
    if (requestBody && requestBody.length > 0) {
      const bytes = requestBody.flatten?.() || requestBody.data;
      if (bytes) {
        const arr = bytes.get_data?.() || bytes;
        body = arr instanceof Uint8Array ? new TextDecoder().decode(arr) : String(arr);
      }
    }

    const params = {
      url: msg.get_uri().get_path(),
      method: msg.get_method(),
      body,
      headers,
    };
    const req = new Request(`http://${location.hostname}${params.url || '/'}`, {
      duplex: 'half',
      uuid: GLib.uuid_string_random(),
      body: params.body,
      fields: {},
      method: params.method || 'GET',
      headers: { ...location, ...params.headers },
    });

    let resp;
    try {
      resp = callback(req, _server);
      if (resp instanceof Response) {
        serverResponse(msg, resp);
      } else if (resp && typeof resp.then === 'function') {
        resp
          .then(r => {
            if (r instanceof Response) {
              serverResponse(msg, r);
            } else {
              serverResponse(msg, new Response('Not Implemented'));
            }
          })
          .catch(err => {
            serverResponse(msg, new Response(err?.message || 'Error', { status: 500 }));
          });
      } else {
        serverResponse(msg, new Response('Not Implemented'));
      }
    } catch (err) {
      serverResponse(msg, new Response(err?.message || 'Error', { status: 500 }));
    }
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
    _serverInstance.disconnect();
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
    encode: (v, s) => GLib.compute_hmac_for_string(GLib.ChecksumType.SHA1, s, String(v), -1),
    compare: (a, b) => a != null && b != null && a === b,
  }, options);

  let sync;
  if (options.watch) {
    sync = env.watcher;
  }

  const call = (req, clients, teardown) => {
    req.headers = new Headers(req.headers);

    let resp = serveFile(req);
    if (!resp) {
      const cookies = parseCookies(req.headers.cookie || '');
      const session = createSessionSync(store, cookies.sid || '$');
      const conn = createConnection(store, session, cookies, options, req, location, teardown);

      resp = createResponseSync(env, conn, clients, options);
      store.write(conn.req.sid, conn.session);
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

  const server = createSoupServer(location, (req, _server) => {
    return resolve(req) || finalResponse(handler.call(req, () => clients, () => _server.stop()));
  }, clients, events);

  Handler.setup({
    on: (e, cb) => { events[e] = cb; },
  }, env, editor, handler, options.timeout || 300);

  if (!options.quiet) {
    printLog(`Listening on ${server.protocol}://${server.hostname}:${server.port}`);
  }

  loop.run()
}
