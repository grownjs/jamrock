import { Template } from '../../dist/main.mjs';

async function loadRoutes(dest) {
  try {
    const indexPath = `${dest}/index.json`;
    const file = JSON.parse(Template.read(indexPath));
    return file.routes || [];
  } catch (e) {
    console.error('Error loading routes:', e);
    return [];
  }
}

function simpleParse(html) {
  if (!html) return [];

  const elements = [];

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    elements.push({ type: 'h1', text: h1Match[1] });
  }

  const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  if (h2Match) {
    elements.push({ type: 'h2', text: h2Match[1] });
  }

  const pMatches = html.match(/<p[^>]*>([^<]+)<\/p>/gi);
  if (pMatches) {
    pMatches.forEach(m => {
      const text = m.replace(/<[^>]+>/g, '').trim();
      if (text) elements.push({ type: 'p', text });
    });
  }

  const buttonMatches = html.match(/<button[^>]*>([^<]+)<\/button>/gi);
  if (buttonMatches) {
    buttonMatches.forEach(m => {
      const text = m.replace(/<[^>]+>/g, '').trim();
      if (text) elements.push({ type: 'button', text });
    });
  }

  return elements;
}

export async function createWindowRouter(options) {
  const { dest, title, width, height } = options;

  console.log('Loading routes from', dest);

  const routes = await loadRoutes('/Users/alvaro/Workspace/jamrock/build');
  const pageRoutes = routes.filter(r => r.verb === 'GET' && r.path !== '*' && !r.path.includes('*'));

  console.log(`Found ${pageRoutes.length} page routes:`, pageRoutes.map(r => r.path).join(', '));

  const { Gtk, Gdk, GLib, Gio } = await import('./deps.js');

  Gtk.init();

  const mainLoop = GLib.MainLoop.new(null, false);

  for (const route of pageRoutes) {
    try {
      const componentPath = route.src?.replace('.generated.mjs', '.html') || '';
      const fullPath = `${dest}/../${componentPath}`;

      let html = '';
      try {
        const file = Gio.File.new_for_path(fullPath);
        const [ok, contents] = file.load_contents(null);
        if (ok) {
          html = new TextDecoder().decode(contents);
        }
      } catch (e) {
        console.log(`Could not load ${fullPath}:`, e.message);
        continue;
      }

      const elements = simpleParse(html);

      if (elements.length === 0) {
        console.log(`No content found for ${route.path}, skipping`);
        continue;
      }

      console.log(`Creating window for ${route.path} with ${elements.length} elements`);

      const window = new Gtk.Window({
        title: route.name || 'Jamrock Window',
        default_width: width || 400,
        default_height: height || 300,
      });

      const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 8,
        margin_top: 16,
        margin_bottom: 16,
        margin_start: 16,
        margin_end: 16,
      });

      for (const el of elements) {
        if (el.type === 'h1' || el.type === 'h2') {
          const label = new Gtk.Label({
            label: el.text,
            halign: Gtk.Align.START,
          });
          label.add_css_class(el.type === 'h1' ? 'title-1' : 'title-2');
          box.append(label);
        } else if (el.type === 'p') {
          const label = new Gtk.Label({
            label: el.text,
            wrap: true,
            halign: Gtk.Align.START,
          });
          box.append(label);
        } else if (el.type === 'button') {
          const btn = new Gtk.Button({
            label: el.text,
          });
          box.append(btn);
        }
      }

      window.set_child(box);
      window.present();
    } catch (e) {
      console.error(`Error creating window for ${route.path}:`, e);
    }
  }

  console.log('Windows opened. Press Ctrl+C to exit.');
  mainLoop.run();

  return { routes: pageRoutes };
}

export async function startWindowMode(options) {
  return createWindowRouter(options);
}
