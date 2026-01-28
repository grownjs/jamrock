// @ts-check

/* global Bun */

import { printLog } from './runtime.js';

import { path, timingSafeEqual, serveStaticFiles, GLib, Soup, Gio } from './deps.js';

import { Handler } from '../../dist/main.mjs';
import { createStore, createConnection, createResponse, parseLocation, finalResponse, serveFrom } from '../../dist/server.mjs';

const DIST_DIR = `${import.meta.url.replace('file://', '').replace(/(\/[^/]+){3}$/, '')}/dist`;

let _serverInstance;
function createSoupServer(location, callback) {
  async function _handle(_server, msg, _path, _query) {
    console.log(1);
    const params = {
      url: msg.get_uri().get_path(),
      body: null,
      method: msg.get_method(),
      headers: {},
    };
    // try {
    console.log(2);
    const req = new Request(`http://${location.hostname}${params.url || '/'}`, {
      // @ts-expect-error
      duplex: 'half',
      body: params.body,
      method: params.method || 'GET',
      headers: { ...location, ...params.headers },
    });
    console.log(3);
    console.log({ req, _server });
    console.log(callback.toString());

    try {
      const resp = callback?.(req, {});
      console.log(Object.keys(resp), resp);
    } catch (e) {
      console.log('WUT');
    } finally {
      console.log('LOL');
      msg.set_status(200, null);
      msg.get_response_headers().set_content_type('text/html', { charset: 'UTF-8' });
      msg.get_response_body().append(`
                <html>
                <body>
                    Greetings, visitor from ${msg.get_remote_host()}<br>
                    What is your name?
                    <form action="/hello">
                        <input name="myname">
                    </form>
                </body>
                </html>
            `);
    }
    // } catch (e) {
    //   console.log('WUT');
    //   logError(e);
    // }
  }

  async function handler(_server, msg, _path, _query) {
    try {
      await _handle(_server, msg, _path, _query);
    } catch (e) {
      logError(e);
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

// FIXME: implements with Soup...?!
export async function createHandler(env, options) {
  const serveFile = serveStaticFiles(options.public || 'public');
  const location = parseLocation(options);
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
      const conn = await createConnection(store, options, request, location, teardown);

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
  const editor = files => Bun.openInEditor(files[0]);
  const resolve = serveFrom(env, DIST_DIR, editor);
  const clients = [];

  const events = {
    open: () => null,
    close: () => null,
  };

  const server = createSoupServer(location, (req, _server) => {
    console.log('REQ');
    return resolve(req); //  || finalResponse(await handler.call(req, () => clients, () => _server.stop()))
  });

  Handler.setup({
    on: (e, cb) => { events[e] = cb; },
  }, env, editor, handler, options.timeout || 300);

  if (!options.quiet) {
    printLog(`Listening on ${server.protocol}://${server.hostname}:${server.port}`);
  }

  loop.run()
}
