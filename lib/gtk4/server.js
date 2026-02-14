/* global Bun */

import { printLog } from './runtime.js';

import { sha1Encode, serverResponse, timingSafeEqual, serveStaticFiles, GLib, Soup } from './deps.js';

import { Handler } from '../../dist/main.mjs';
import {
  createStore, createSessionSync, createConnection, createResponseSync, parseLocation, parseCookies, finalResponse, serveFrom
} from '../../dist/server.mjs';

const DIST_DIR = `${import.meta.url.replace('file://', '').replace(/(\/[^/]+){3}$/, '')}/dist`;

let _serverInstance;
function createSoupServer(location, callback) {
  function _queue(method, url) {
    const params = {
      url,
      method,
      body: null,
      headers: {},
    };
    const req = new Request(`http://${location.hostname}${params.url || '/'}`, {
      // @ts-expect-error
      duplex: 'half',
      uuid: 'test-id',
      body: params.body,
      fields: {},
      method: params.method || 'GET',
      headers: { ...location, ...params.headers },
    });
    return callback(req);
  }

  function handler(_server, msg, _path, _query) {
    msg.pause();

    // OK, is not possible to run asynchronous code within server callbacks,
    // any Promise call or somthing will never work... so everything mast be sync!
    // probably using just callbacks could work, but we need to rewrite almost everything to do so...
    // instead, we can provide a lower-level usage for the server and such, like just serving static markup,
    // or even just running modules with all `async/await` stripped the shit out of the compiled modules,
    // so the modules will behave all sync... well, we can LOAD them using import() calls, but calling them
    // should be in SYNC otherwise they'll won't work...
    const resp = _queue(msg.get_method(), msg.get_uri().get_path());

    // console.log({resp});
    if (resp instanceof Response) {
      serverResponse(msg, resp);
    } else {
      setTimeout(() => {
        serverResponse(msg, new Response('Not Implemented'));
      }, 1000);
    }
  }

  // this won't be GC'ed
  _serverInstance = new Soup.Server();
  _serverInstance.add_handler('/', handler);
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
    encode: (v, s) => Buffer.from(sha1Encode(s + v)).toString('base64'),
    compare: (a, b) => a && b && timingSafeEqual(Buffer.from(a), Buffer.from(b)),
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
  const editor = files => Bun.openInEditor(files[0]);
  const resolve = serveFrom(env, DIST_DIR, editor);
  const clients = [];

  const events = {
    open: () => null,
    close: () => null,
  };

  const server = createSoupServer(location, (req, _server) => {
    return resolve(req) || finalResponse(handler.call(req, () => clients, () => _server.stop()));
  });

  Handler.setup({
    on: (e, cb) => { events[e] = cb; },
  }, env, editor, handler, options.timeout || 300);

  if (!options.quiet) {
    printLog(`Listening on ${server.protocol}://${server.hostname}:${server.port}`);
  }

  loop.run()
}
