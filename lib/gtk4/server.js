import { printLog } from './runtime.js';

import { serverResponse, serveStaticFiles, GLib, Soup } from './deps.js';

import {
  createConnection,
  createResponseSync,
  parseLocation,
  parseCookies,
  createStore,
  createSession,
  finalResponse,
  serveFrom,
} from '../../dist/server.mjs';

const DIST_DIR = `${import.meta.url.replace('file://', '').replace(/(\/[^/]+){3}$/, '')}/dist`;

export async function getLocationStore(options) {
  const location = parseLocation(options);
  const store = await createStore({
    encode: (v, s) => GLib.compute_hmac_for_string(GLib.ChecksumType.SHA1, s, v, -1),
    compare: (a, b) => a === b,
  }, options);
  return { location, store };
}

export function getSessionCookies(req, store) {
  const cookiesObj = parseCookies(req.headers.get('cookie') || '');
  const cookies = new Map(Object.entries(cookiesObj));
  const session = createSession(store, cookies.get('sid') || '$');
  return { session, cookies };
}

let _serverInstance;

export function createSoupServer(location, callback, _clients, _events) {
  const sseSockets = new Map();

  function sseHandler(_server, msg) {
    const uuid = GLib.uuid_string_random();

    msg.set_status(200, 'OK');
    msg.get_response_headers().set_content_type('text/event-stream', { charset: 'utf-8' });
    msg.get_response_headers().append('Cache-Control', 'no-cache');
    msg.get_response_headers().append('Connection', 'keep-alive');

    const body = msg.get_response_body();
    body.append(`data: {"welcome","${uuid}"}\n\n`);
    msg.unpause();

    const sseSocket = {
      identity: uuid,
      send: data => {
        const encoded = `data: ${JSON.stringify(data)}\n\n`;
        body.append(encoded);
      },
    };

    sseSockets.set(uuid, sseSocket);
    printLog(`[SSE] connected, uuid: ${uuid}`);

    msg.connect('finished', () => {
      sseSockets.delete(uuid);
      printLog(`[SSE] disconnected, uuid: ${uuid}`);
    });
  }

  async function handler(_server, msg) {
    const path = msg.get_uri().get_path();

    if (path === '/sse') {
      sseHandler(_server, msg);
      return;
    }

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
      url: path,
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
      headers: new Headers(params.headers),
    });

    try {
      const result = callback(req, _server);

      msg.unpause();
      if (result instanceof Response) {
        serverResponse(msg, result);
      } else {
        serverResponse(msg, new Response('Not Implemented'));
      }
    } catch (err) {
      msg.unpause();
      serverResponse(msg, new Response(err?.message || 'Error', { status: 500 }));
    }
  }

  _serverInstance = new Soup.Server();
  _serverInstance.add_handler('/', handler);
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

  let sync;
  if (options.watch) {
    sync = env.watcher;
  }

  const call = (req, teardown) => {
    req.headers = new Headers(req.headers);

    let resp = serveFile(req);
    if (resp) {
      return finalResponse(resp);
    }

    const server = { protocol: location.protocol, hostname: location.hostname, port: location.port, teardown };
    const conn = createConnection(req, server, options);

    resp = createResponseSync(env, conn, options);

    return finalResponse(resp);
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

  const server = createSoupServer(location, (req, _server) => {
    const resolved = resolve(req);
    if (resolved) {
      return resolved;
    }
    return handler.call(req, () => _server.stop());
  });

  if (!options.quiet) {
    printLog(`Listening on ${server.protocol}://${server.hostname}:${server.port}`);
  }

  loop.run();
}
