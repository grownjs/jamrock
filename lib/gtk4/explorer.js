import { createConnection } from '../../dist/server.mjs';
import { parseLocation } from '../../dist/server.mjs';
import { createApplication } from '../../dist/gtk.mjs';
import { Template } from '../../dist/main.mjs';
import { path, GLib, Gtk } from './deps.js';

export const BASE_DIR = GLib.get_current_dir();

export async function createExplorer({ env, options }) {
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
    console.log('Error loading routes:', e);
  }

  const location = parseLocation(options);
  const routes = Object.keys(env.files).sort();

  function renderPage(urlPath) {
    try {
      const req = new Request(`http://${location.hostname}${urlPath}`, {
        duplex: 'half',
        uuid: GLib.uuid_string_random(),
        body: null,
        fields: {},
        method: 'GET',
        headers: new Headers(),
      });

      const server = {
        protocol: location.protocol,
        hostname: location.hostname,
        port: location.port,
      };

      const conn = createConnection(req, server, options);
      const result = Template.resolve(env.files[urlPath] || env.files['/'], null, conn);

      return result;
    } catch (err) {
      return { error: err.message, stack: err.stack };
    }
  }

  console.log('Jamrock Explorer - Press Ctrl+C to exit');

  createApplication({
    onClose: () => console.log('Explorer closed'),
  }, ({ self, open }) => {
    let currentPath = '/';
    let history = ['/'];
    let historyIndex = 0;

    function navigate(urlPath) {
      if (urlPath === currentPath) return;

      if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
      }
      history.push(urlPath);
      historyIndex = history.length - 1;
      currentPath = urlPath;

      const result = renderPage(urlPath);
      self.preview.set_label(result.body || result.error || 'No content');
      self.address.set_text(urlPath);
    }

    function goBack() {
      if (historyIndex > 0) {
        historyIndex--;
        navigate(history[historyIndex]);
      }
    }

    function goForward() {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        navigate(history[historyIndex]);
      }
    }

    function onAddressChange(e) {
      if (e.type === 'activated') {
        navigate(e.value || '/');
      }
    }

    function onRouteSelect(e) {
      if (e.type === 'activated' && e.value) {
        navigate(e.value);
      }
    }

    open(({ label, entry, button, scroll, vstack, hstack, listview }) => {
      const routeStore = new Gtk.StringList();
      routes.forEach(r => routeStore.append(r));

      return vstack([
        hstack([
          button('←', { onClick: goBack }),
          button('→', { onClick: goForward }),
          entry('/', { onChange: onAddressChange, name: 'address' }),
        ], { className: 'header' }),
        hstack([
          scroll(listview(routeStore, { onChange: onRouteSelect, name: 'sidebar' })),
          scroll(label('Select a route to preview', { name: 'preview', className: 'hx vy' })),
        ], { className: 'main' }),
      ]);
    });
  });
}

export async function startExplorer(env, options) {
  console.log('Starting Jamrock Explorer...');
  createExplorer({ env, options });
}
