import { createConnection, createResponseSync } from '../../dist/server.mjs';
import { getLocationStore, getSessionCookies } from './server.js';
import { createApplication } from '../../dist/gtk.mjs';
import { Template } from '../../dist/gtk-main.mjs';
import { path, GLib } from './deps.js';

export const BASE_DIR = GLib.get_current_dir();

export async function createWindowRouter({ env, options }) {
  try {
    const pageMods = await Promise.all(Object.values(env.files)
      .map(p => Template.load(path.join(BASE_DIR, p.filepath))));

    for (const mod of pageMods) {
      const cache = Template.cache.get(mod.__dest);
      if (!cache?.module) {
        Template.cache.set(mod.__dest, { ...cache, module: mod });
      }
    }
  } catch (e) {
    console.log(e);
  }

  const { location, store } = await getLocationStore(options);

  function teardown() {
    console.log('EXIT');
  }

  try {
    console.log('Windows opened. Press Ctrl+C to exit.');

    createApplication({
      onClose: () => {
        console.log('DONE!');
      },
    }, ({ self, open }) => {
      function findPage(e) {
        if (e.type === 'activated') {
          try {
            const req = new Request(`http://${location.hostname}${e.value}`, {
              duplex: 'half',
              uuid: GLib.uuid_string_random(),
              body: null,
              fields: {},
              method: 'GET',
              headers: new Headers(),
            });

            const { session, cookies } = getSessionCookies(req, store);
            const conn = createConnection(store, session, cookies, options, req, location, teardown);
            const resp = createResponseSync(env, conn, options);

            store.write(conn.req.sid, conn.session);
            // console.log(resp);

            // win.set_child(webview);
            self.debug.set_label(resp.body);
          } catch (err) {
            console.log(err);
          }
        }
      }

      open(({ label, scroll, entry, vstack }) => {
        return vstack([
          entry('', { onChange: findPage }),
          scroll(label('', { name: 'debug', className: 'hx vx' })),
        ]);
      });
    });
  } catch (e) {
    console.error(e);
  }
}

export async function startWindowMode(env, options) {
  console.log('Loading routes from', options.dest);
  createWindowRouter({ env, options });
}
