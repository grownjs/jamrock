import {
  createApplication, vstack, label, button, box, hstack,
  entry, dropdown, toggle, range, progress, level, scroll, push,
  calendar, spinner, separator, overlay, revealer, grid, frame,
  expander, image, linkbutton, spinbutton, textview, infobar, levelbar,
} from '../../dist/gtk.mjs';
import { Template } from '../../dist/main.mjs';
import { path, GLib } from './deps.js';
import { signal, computed, effect, batch, untracked, scope, ref } from './signals.js';
import Gtk from 'gi://Gtk?version=4.0';

export const BASE_DIR = GLib.get_current_dir();

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
  const handlerName = getAttrValue(attrs, 'value') || getAttrValue(attrs, handlerKey);
  if (handlerName && state[handlerName]) {
    return state[handlerName];
  }
  if (attrs[handlerKey] && typeof attrs[handlerKey] === 'function') {
    return attrs[handlerKey];
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
  for (const [key, value] of Object.entries(state)) {
    if (value && typeof value.subscribe === 'function') {
      disposers.push(value.subscribe(callback));
    }
  }
  return () => disposers.forEach(d => d());
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

export async function createExplorer({ env, options }) {
  console.log('Jamrock Explorer');
  console.log('Source:', options.src);

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
    
    const result = await Template.resolve(mod, filepath, ctx, {}, null);
    return { ...result, data };
  }

  createApplication({
    onClose: () => {
      console.log('Closed');
    },
  }, ({ self, open }) => {
    let contentArea = null;
    let currentComponent = null;
    let currentState = {};
    let dispose = null;

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

      dispose = subscribeToSignals(currentState, () => loadAndRender(filename));
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

    open(() => {
      const sidebar = createSidebar(componentFiles, (filename) => {
        console.log('Selected:', filename);
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

      const paned = new Gtk.Paned({ orientation: Gtk.Orientation.HORIZONTAL });
      paned.set_start_child(sidebarScroll);
      paned.set_end_child(contentScroll);
      paned.set_position(200);

      loadAndRender(componentFiles[0]);

      return paned;
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
