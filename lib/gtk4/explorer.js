import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk?version=4.0';
import Gio from 'gi://Gio';
import {
  createApplication, vstack, label, button, box, hstack,
  entry, dropdown, toggle, range, progress, level, scroll, push,
  calendar, spinner, separator, overlay, revealer, grid, frame,
  expander, image, linkbutton, spinbutton, textview, infobar, levelbar,
} from '../../dist/gtk.mjs';
import { Template, Runtime } from '../../dist/main.mjs';
import { path, GLib } from './deps.js';

const { signal, computed, effect, batch, untracked, scope, ref } = Runtime;

export const BASE_DIR = GLib.get_current_dir();

const EXPLORER_CSS = `
  .sidebar-button {
    padding: 8px 12px;
  }
  .sidebar-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  .header-label {
    font-weight: bold;
    font-size: 14px;
  }
  .component-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 12px;
  }
`;

const GTK_HOOKS = {
  signal,
  computed,
  effect,
  batch,
  untracked,
  scope,
  ref,
};

const GTK_ELEMENTS = {
  vstack,
  hstack,
  box,
  label,
  button,
  entry,
  dropdown,
  toggle,
  range,
  progress,
  level,
  scroll,
  push,
  calendar,
  spinner,
  separator,
  overlay,
  revealer,
  grid,
  frame,
  expander,
  image,
  linkbutton,
  spinbutton,
  textview,
  infobar,
  levelbar,
};

function getAttrValue(attrs, key) {
  const val = attrs[key];
  if (typeof val === 'function') {
    try {
      return val();
    } catch {
      return val;
    }
  }
  return val;
}

function resolveHandler(attrs, state, handlerKey = 'onclick') {
  const handlerValue = attrs[handlerKey];
  if (typeof handlerValue === 'function') {
    return handlerValue;
  }
  if (typeof handlerValue === 'string' && state[handlerValue]) {
    return state[handlerValue];
  }
  return null;
}

function flattenChildren(children) {
  if (!Array.isArray(children)) return children;
  const result = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else {
      result.push(child);
    }
  }
  return result;
}

function vnodeToWidget(vnode, state = {}) {
  if (!vnode) return null;
  if (typeof vnode === 'string') return new Gtk.Label({ label: vnode });
  if (typeof vnode === 'number') return new Gtk.Label({ label: String(vnode) });
  if (!Array.isArray(vnode)) return new Gtk.Label({ label: String(vnode) });

  const [name, attrs, children] = vnode;
  const factory = GTK_ELEMENTS[name];

  if (!factory) {
    console.warn(`Unknown element: ${name}`);
    return new Gtk.Label({ label: `<${name}>` });
  }

  const flatChildren = flattenChildren(children);

  if (name === 'label') {
    const textParts = Array.isArray(flatChildren)
      ? flatChildren.map(c => {
        if (typeof c === 'string') return c;
        if (typeof c === 'number') return String(c);
        if (typeof c === 'function') {
          const val = c();
          return val ?? '';
        }
        return '';
      })
      : [];
    const text = textParts.join('');
    return new Gtk.Label({ label: text, wrap: true });
  }

  if (name === 'button') {
    const text = Array.isArray(flatChildren) ? flatChildren[0] : flatChildren || 'Button';
    const handler = resolveHandler(attrs, state, 'onclick');
    let buttonText = 'Button';
    if (typeof text === 'string') {
      buttonText = text;
    } else if (typeof text === 'number') {
      buttonText = String(text);
    } else if (typeof text === 'function') {
      buttonText = String(text() ?? 'Button');
    }
    return factory(buttonText, { onClick: handler });
  }

  if (name === 'entry') {
    const placeholder = Array.isArray(flatChildren) ? flatChildren[0] : flatChildren || '';
    const handler = resolveHandler(attrs, state, 'onchange');
    let placeholderText = '';
    if (typeof placeholder === 'string') {
      placeholderText = placeholder;
    } else if (typeof placeholder === 'number') {
      placeholderText = String(placeholder);
    } else if (typeof placeholder === 'function') {
      placeholderText = String(placeholder() ?? '');
    }
    return factory(placeholderText, { onChange: handler });
  }

  if (name === 'toggle') {
    const handler = resolveHandler(attrs, state, 'onclick');
    const active = getAttrValue(attrs, 'active');
    return factory(null, { onChange: handler, active });
  }

  if (name === 'range') {
    const value = getAttrValue(attrs, 'value');
    const handler = resolveHandler(attrs, state, 'onchange');
    return factory(typeof value === 'number' ? value : 0, { onChange: handler });
  }

  if (name === 'progress') {
    const value = getAttrValue(attrs, 'value');
    return factory(typeof value === 'number' ? value : 0);
  }

  if (name === 'level') {
    const value = getAttrValue(attrs, 'value');
    return factory(typeof value === 'number' ? value : 0);
  }

  if (name === 'scroll') {
    const child = Array.isArray(flatChildren) ? flatChildren[0] : null;
    const childWidget = child ? vnodeToWidget(child, state) : null;
    return factory(childWidget);
  }

  if (name === 'push') {
    const text = Array.isArray(flatChildren) ? flatChildren[0] : flatChildren || '';
    return factory(text);
  }

  const childWidgets = Array.isArray(flatChildren)
    ? flatChildren.map(c => vnodeToWidget(c, state)).filter(Boolean)
    : [];

  return factory(childWidgets, {});
}

function subscribeToSignals(state, callback) {
  const disposers = [];
  for (const [_key, value] of Object.entries(state)) {
    if (value && typeof value.subscribe === 'function') {
      disposers.push(value.subscribe(callback));
    }
  }
  return () => disposers.forEach(d => d());
}

function loadCSS(cssString) {
  const provider = new Gtk.CssProvider();
  provider.load_from_data(cssString, cssString.length);

  const display = Gdk.Display.get_default();
  if (display) {
    Gtk.StyleContext.add_provider_for_display(
      display,
      provider,
      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
    );
  }
}

function createSidebar(componentFiles, onSelect) {
  const sidebarItems = [
    new Gtk.Label({ label: 'Components', halign: Gtk.Align.START }),
    new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }),
  ];

  for (const file of componentFiles) {
    const name = file.replace('playground/', '').replace('.html', '');
    const btn = new Gtk.Button({ label: name });
    btn.connect('clicked', () => onSelect(file));
    sidebarItems.push(btn);
  }

  const sidebarBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
  sidebarBox.set_margin_top(12);
  sidebarBox.set_margin_bottom(12);
  sidebarBox.set_margin_start(12);
  sidebarBox.set_margin_end(12);

  for (const item of sidebarItems) {
    sidebarBox.append(item);
  }

  return sidebarBox;
}

function createInspector(state) {
  const inspectorBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
  inspectorBox.set_margin_top(12);
  inspectorBox.set_margin_bottom(12);
  inspectorBox.set_margin_start(12);
  inspectorBox.set_margin_end(12);

  inspectorBox.append(new Gtk.Label({ label: 'Inspector', halign: Gtk.Align.START }));
  inspectorBox.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));

  if (!state || Object.keys(state).length === 0) {
    inspectorBox.append(new Gtk.Label({ label: 'No state available', halign: Gtk.Align.START }));
    return inspectorBox;
  }

  for (const [key, value] of Object.entries(state)) {
    const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });

    const keyLabel = new Gtk.Label({ label: key, halign: Gtk.Align.START });
    keyLabel.set_width_chars(15);

    let valueText = '';
    if (value && typeof value.subscribe === 'function') {
      valueText = `signal(${value.value})`;
    } else if (typeof value === 'function') {
      valueText = 'function()';
    } else {
      valueText = String(value);
    }

    const valueLabel = new Gtk.Label({ label: valueText, halign: Gtk.Align.START });

    row.append(keyLabel);
    row.append(valueLabel);
    inspectorBox.append(row);
  }

  return inspectorBox;
}

export async function createExplorer({ env, options }) {
  console.log('Jamrock Explorer');
  console.log('Source:', options.src);

  loadCSS(EXPLORER_CSS);

  await env.compiler.reload();

  const files = Object.keys(env.files);
  console.log('Files:', files);

  const componentFiles = files.filter(f => f.endsWith('.html'));
  console.log('Components:', componentFiles);

  const componentCache = new Map();

  async function loadComponent(filename) {
    if (componentCache.has(filename)) {
      return componentCache.get(filename);
    }

    const key = files.find(f => f.includes(filename));
    if (!key) {
      console.error(`File not found: ${filename}`);
      return null;
    }

    const mod = env.locate(key);
    const filepath = env.files[key].filepath;

    if (!mod.__template) {
      console.error(`No template in ${filename}`);
      return null;
    }

    const info = { mod, filepath, key };
    componentCache.set(filename, info);
    return info;
  }

  async function renderComponent(mod, filepath) {
    const ctx = {
      depth: 0,
      stack: [],
      scope: {},
      mixins: new Map(),
      tag: null,
      route: {},
      hooks: GTK_HOOKS,
    };

    const { loader } = Template.prepare(mod, null, ctx);

    const self = mod.__handler ? await mod.__handler({}, loader) : null;
    const main = self?.__context ? self.__context() : null;
    const data = main?.__callback?.() || {};

    const result = await Template.resolve(mod, filepath, ctx, data, null);
    return { ...result, data };
  }

  createApplication({
    onClose: () => {
      console.log('Closed');
    },
  }, ({ self: _self, open }) => {
    let contentArea = null;
    let inspectorArea = null;
    let currentComponent = null;
    let currentState = {};
    let dispose = null;
    let fileMonitors = [];

    async function reloadComponent() {
      if (!currentComponent) return;

      console.log('Reloading:', currentComponent.key);

      componentCache.delete(currentComponent.key);

      await env.compiler.reload();

      loadAndRender(currentComponent.key);
    }

    function setupHotReload() {
      const srcDir = path.join(BASE_DIR, options.src);

      try {
        const dir = Gio.File.new_for_path(srcDir);
        const monitor = dir.monitor_directory(Gio.FileMonitorFlags.NONE, null);

        monitor.connect('changed', (mon, file, otherFile, eventType) => {
          if (eventType === Gio.FileMonitorEvent.CHANGED) {
            const filename = file.get_path();
            if (filename && filename.endsWith('.html')) {
              console.log('File changed:', filename);
              setTimeout(reloadComponent, 100);
            }
          }
        });

        fileMonitors.push(monitor);
      } catch (e) {
        console.log('Hot reload not available:', e.message);
      }
    }

    async function loadAndRender(filename) {
      if (dispose) {
        dispose();
        dispose = null;
      }

      const info = await loadComponent(filename);
      if (!info) {
        updateContentArea(new Gtk.Label({ label: `Error: ${filename} not found` }));
        return;
      }

      currentComponent = info;
      const result = await renderComponent(info.mod, info.filepath);

      if (result && result.data) {
        currentState = result.data;
      }

      const widget = result && result.body && result.body[0]
        ? vnodeToWidget(result.body[0], currentState)
        : new Gtk.Label({ label: 'Empty component' });

      updateContentArea(widget);
      updateInspector(currentState);

      dispose = subscribeToSignals(currentState, () => {
        loadAndRender(filename).catch(e => {
          console.error('Error re-rendering component:', e);
        });
      });
    }

    function updateContentArea(widget) {
      if (!contentArea) return;

      let child = contentArea.get_first_child();
      while (child) {
        contentArea.remove(child);
        child = contentArea.get_first_child();
      }

      contentArea.append(widget);
    }

    function updateInspector(state) {
      if (!inspectorArea) return;

      let child = inspectorArea.get_first_child();
      while (child) {
        inspectorArea.remove(child);
        child = inspectorArea.get_first_child();
      }

      const inspector = createInspector(state);
      inspectorArea.append(inspector);
    }

    open(() => {
      const sidebar = createSidebar(componentFiles, filename => {
        console.log('Selected:', filename);
        loadAndRender(filename).catch(e => {
          console.error('Error loading component:', e);
          updateContentArea(new Gtk.Label({ label: `Error: ${e.message}` }));
        });
      });

      const sidebarScroll = new Gtk.ScrolledWindow();
      sidebarScroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
      sidebarScroll.set_min_content_width(180);
      sidebarScroll.set_child(sidebar);

      contentArea = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
      contentArea.set_margin_top(12);
      contentArea.set_margin_bottom(12);
      contentArea.set_margin_start(12);
      contentArea.set_margin_end(12);
      contentArea.append(new Gtk.Label({ label: 'Select a component from the sidebar' }));

      const contentScroll = new Gtk.ScrolledWindow();
      contentScroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
      contentScroll.set_child(contentArea);

      inspectorArea = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
      inspectorArea.append(new Gtk.Label({ label: 'Inspector' }));

      const inspectorScroll = new Gtk.ScrolledWindow();
      inspectorScroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
      inspectorScroll.set_min_content_width(200);
      inspectorScroll.set_child(inspectorArea);

      const mainPaned = new Gtk.Paned({ orientation: Gtk.Orientation.HORIZONTAL });
      mainPaned.set_start_child(contentScroll);
      mainPaned.set_end_child(inspectorScroll);
      mainPaned.set_position(600);

      const rootPaned = new Gtk.Paned({ orientation: Gtk.Orientation.HORIZONTAL });
      rootPaned.set_start_child(sidebarScroll);
      rootPaned.set_end_child(mainPaned);
      rootPaned.set_position(180);

      setupHotReload();
      loadAndRender(componentFiles[0]).catch(e => {
        console.error('Error loading initial component:', e);
        updateContentArea(new Gtk.Label({ label: `Error: ${e.message}` }));
      });

      return rootPaned;
    });
  });
}

export async function startExplorer(env, options) {
  try {
    await createExplorer({ env, options });
  } catch (e) {
    console.error('Explorer error:', e);
  }
}
