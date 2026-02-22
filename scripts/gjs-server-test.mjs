#!/usr/bin/env -S gjs -m
// Integration test: verifies that createSoupServer + createHandler correctly
// process async requests end-to-end in the GJS/GLib runtime.
//
// Usage:
//   make gjs-async-server  (via Makefile)
//
// PASS = request completed and got a response (any HTTP status)
// FAIL = unexpected error setting up the test
// HANG = no response after 5s (the bug we're hunting)
//
// Strategy: hook into env.serve() by providing a custom createServer that
// does NOT call loop.run() (the test's outer loop is already running).
// This lets the real compiler.reload() path run (loads routes into memory)
// while the test retains control over the Soup server and assertion.

import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

const loop = GLib.MainLoop.new(null, false);
const PORT = 19003;

let resolved = false;

function done(label, body) {
  resolved = true;
  print(label + (body ? ` (${body})` : ''));
  loop.quit();
}

// Hang watchdog: if no response in 8s, print HANG
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 8000, () => {
  if (!resolved) done('HANG');
  return GLib.SOURCE_REMOVE;
});

// Defer all async setup until after loop.run() so the main loop is running
GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
  // Dynamic imports so runtime.js sets up globals (Response, Request, Headers,
  // crypto, etc.) before any other module that depends on them.
  import('../lib/gtk4/runtime.js')
    .then(() => Promise.all([
      import('../lib/gtk4/server.js'),
      import('../lib/gtk4/deps.js'),
      import('../dist/server.mjs'),
      import('../lib/gtk4/deps.js'), // GLib, Gio etc already imported
    ]))
    .then(async ([serverMod, depsMod, distMod]) => {
      const { createSoupServer, createHandler } = serverMod;
      const { finalResponse, serveFrom } = distMod;

      const options = {
        src: 'x-gtk-sandbox',
        dest: 'dist',
        port: PORT,
        quiet: true,
        prefix: '@',   // matches the actual gjs-serve default
        public: 'public',
        watch: true,   // matches the actual dev/serve mode
      };

      // Custom createServer that avoids calling loop.run() (the test loop
      // is already running). This runs after compiler.reload() which loads
      // routes into memory — the key difference from calling build().
      async function testCreateServer(env, srvOptions) {
        const DIST_DIR = GLib.get_current_dir() + '/dist';
        const editor = () => {};
        const resolve = serveFrom(env, DIST_DIR, editor);
        const clients = [];
        const events = { open: () => null, close: () => null };

        const { handler, location } = await createHandler(env, srvOptions);

        const server = createSoupServer(location, async (req, _server) => {
          return resolve(req) || finalResponse(await handler.call(req, () => clients, () => _server.disconnect()));
        }, clients, events);

        print(`Server listening on ${server.protocol}://${server.hostname}:${server.port}`);

        // Make a test request after 200ms
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
          const session = new Soup.Session();
          // /pages maps to index+page.html (the real route, not a 404)
          const msg = Soup.Message.new('GET', `http://127.0.0.1:${PORT}/pages`);
          session.send_async(msg, GLib.PRIORITY_DEFAULT, null, (_s, res) => {
            try {
              const stream = session.send_finish(res);
              const bytes = stream.read_bytes(4096, null);
              const body = new TextDecoder().decode(bytes.get_data());
              const status = msg.get_status();
              // Any completed response (even 404/500) means the async chain resolved
              const preview = body.substring(0, 120).replace(/\n/g, ' ');
              done(status >= 200 && status < 600 ? 'PASS' : 'FAIL', `status=${status} body="${preview}"`);
            } catch (e) {
              done('FAIL', String(e));
            }
          });
          return GLib.SOURCE_REMOVE;
        });

        // Note: intentionally NO loop.run() here — the outer test loop handles it
      }

      // Use createEnvironment via main.mjs but with our custom createServer
      // so env.serve() goes through compiler.reload() without blocking on loop.run()
      const { default: createEnvBase } = await import('../lib/gtk4/main.mjs');
      const { createEnvironment } = await import('../dist/server.mjs');
      const { fs, path, Gio } = await import('../lib/gtk4/deps.js');

      function createGioWatcher() {
        const watchers = new Map();
        const events = { change: [] };
        return {
          watch(dir) {
            const file = Gio.File.new_for_path(dir);
            const monitor = file.monitor_directory(0, null);
            monitor.connect('changed', (mon, file1) => {
              for (const cb of events.change) cb(file1.get_path());
            });
            watchers.set(dir, monitor);
            return {
              on(event, cb) { if (events[event]) events[event].push(cb); },
              close: () => { monitor.cancel(); watchers.delete(dir); },
            };
          },
          close: () => { for (const m of watchers.values()) m.cancel(); watchers.clear(); },
        };
      }

      const env = createEnvironment({ fs, path }, options, {
        createServer: testCreateServer,
        getChokidarModule: createGioWatcher,
      });

      // serve() → compiler.reload() (loads routes) → testCreateServer (our hook)
      await env.serve();
    })
    .catch(err => {
      logError(err);
      done('FAIL', String(err));
    });

  return GLib.SOURCE_REMOVE;
});

loop.run();
