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
    if (Array.isArray(child) && child.length >= 2 && typeof child[0] === 'string') {
      result.push(child);
    } else if (Array.isArray(child)) {
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
    console.warn('>>> Unknown element:', name, '| attrs:', Object.keys(attrs || {}));
    return new Gtk.Label({ label: `<${name}>` });
  }

  if (name === 'vstack' || name === 'button') {
    console.log('>>> vnode:', name, '| children count:', children?.length, '| first child:', typeof children?.[0]);
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

  if (name === 'linkbutton') {
    const text = Array.isArray(flatChildren) ? flatChildren[0] : flatChildren || 'Link';
    return factory(typeof text === 'string' ? text : 'Link', {});
  }

  const noChildWidgets = [
    'spinbutton', 'spinner', 'calendar', 'clock', 'separator', 'image', 'progress', 'level',
  ];
  if (noChildWidgets.includes(name)) {
    return factory({});
  }

  const childWidgets = Array.isArray(flatChildren)
    ? flatChildren.map(c => vnodeToWidget(c, state)).filter(Boolean)
    : [];

  const types = childWidgets.map(w => w?.constructor?.name || 'null').join(', ');
  console.log('>>> Container:', name, 'children:', childWidgets.length, '| types:', types);

  return factory(childWidgets, {});
}

function _subscribeToSignals(state, callback) {
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
  console.log('\n========================================');
  console.log('  Jamrock Explorer');
  console.log('========================================');
  console.log('Source:', options.src);
  console.log('\n>>> INSTRUCTIONS:');
  console.log('>>> 1. Click a component name in the LEFT sidebar');
  console.log('>>> 2. The component should appear in the RIGHT pane');
  console.log('>>> 3. Interact with the component (buttons, etc.)');
  console.log('>>> 4. Close the window when done testing\n');

  loadCSS(EXPLORER_CSS);

  await env.compiler.reload();

  const files = Object.keys(env.files);
  console.log('Files:', files);

  const componentFiles = files.filter(f => f.endsWith('.html'));
  console.log('Components:', componentFiles);

  const compiledComponents = new Map();

  async function preloadComponents() {
    console.log('>>> Preloading components...');
    for (const filename of componentFiles) {
      try {
        const key = files.find(f => f.includes(filename));
        if (!key) continue;

        const mod = env.locate(key);
        const filepath = env.files[key].filepath;

        if (!mod.__template) continue;

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

        compiledComponents.set(filename, { result, data, mod, filepath });
        console.log('>>> Preloaded:', filename);
      } catch (e) {
        console.log('>>> Skipped:', filename, '-', e.message);
      }
    }
    console.log('>>> Preloading complete');
  }

  function renderComponentSync(filename) {
    const compiled = compiledComponents.get(filename);
    if (!compiled) {
      console.error('Component not preloaded:', filename);
      return null;
    }
    return compiled;
  }

  await preloadComponents();

  createApplication({
    onClose: () => {
      console.log('Closed');
    },
  }, ({ self: _self, open }) => {
    let contentArea = null;
    let inspectorArea = null;
    let currentState = {};
    let dispose = null;
    let fileMonitors = [];

    function reloadComponent() {
      console.log('>>> Hot reload not implemented for preloaded components');
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

    function loadAndRender(filename) {
      if (dispose) {
        dispose();
        dispose = null;
      }

      console.log('>>> Loading:', filename);
      const compiled = renderComponentSync(filename);
      if (!compiled) {
        updateContentArea(new Gtk.Label({ label: `Error: ${filename} not found` }));
        return;
      }

      const { result, data } = compiled;
      currentState = data;

      console.log('>>> State keys:', Object.keys(currentState));

      const widget = result && result.body && result.body[0]
        ? vnodeToWidget(result.body[0], currentState)
        : new Gtk.Label({ label: 'Empty component' });

      console.log('>>> Widget created:', widget?.constructor?.name);
      updateContentArea(widget);
      updateInspector(currentState);

      // TODO: Re-enable after fixing re-render crash
      // dispose = subscribeToSignals(currentState, () => {
      //   loadAndRender(filename);
      // });
    }

    function updateContentArea(widget) {
      if (!contentArea) {
        console.log('\n=== ERROR: contentArea is null ===\n');
        return;
      }

      console.log('\n=== UPDATING CONTENT AREA ===');
      console.log('Widget type:', widget?.constructor?.name || 'null');

      let child = contentArea.get_first_child();
      while (child) {
        contentArea.remove(child);
        child = contentArea.get_first_child();
      }

      contentArea.append(widget);
      console.log('=== WIDGET MOUNTED ===\n');
      console.log('>>> EXPECT: You should see the component in the right pane');
      console.log('>>> ACTION: Click the button and tell me if the label updates\n');
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
        console.log('\n>>> CLICKED:', filename);
        loadAndRender(filename);
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
      loadAndRender(componentFiles[0]);

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
