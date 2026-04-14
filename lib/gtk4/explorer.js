import {
  createApplication, vstack, label, button, box, hstack,
  entry, dropdown, toggle, range, progress, level, scroll, push,
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

function resolveHandler(attrs, state) {
  const handlerName = getAttrValue(attrs, 'value') || getAttrValue(attrs, 'onclick');
  if (handlerName && state[handlerName]) {
    return state[handlerName];
  }
  if (attrs.onclick && typeof attrs.onclick === 'function') {
    return attrs.onclick;
  }
  return null;
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

  if (name === 'label') {
    const textParts = Array.isArray(children)
      ? children.map(c => {
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
    const text = Array.isArray(children) ? children[0] : children || 'Button';
    const handler = resolveHandler(attrs, state);
    const buttonText = typeof text === 'string' ? text : typeof text === 'number' ? String(text) : 'Button';
    return factory(buttonText, { onClick: handler });
  }

  if (name === 'entry') {
    const placeholder = Array.isArray(children) ? children[0] : children || '';
    const handler = resolveHandler(attrs, state);
    return factory(placeholder, { onChange: handler });
  }

  if (name === 'toggle') {
    const handler = resolveHandler(attrs, state);
    return factory(null, { onClick: handler });
  }

  if (name === 'range') {
    const value = getAttrValue(attrs, 'value');
    const handler = resolveHandler(attrs, state);
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
    const child = Array.isArray(children) ? children[0] : null;
    const childWidget = child ? vnodeToWidget(child, state) : null;
    return factory(childWidget);
  }

  if (name === 'push') {
    const text = Array.isArray(children) ? children[0] : children || '';
    return factory(text);
  }

  const childWidgets = Array.isArray(children)
    ? children.map(c => vnodeToWidget(c, state)).filter(Boolean)
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

export async function createExplorer({ env, options }) {
  console.log('Jamrock Explorer');
  console.log('Source:', options.src);

  await env.compiler.reload();

  const files = Object.keys(env.files);
  console.log('Files:', files);

  const componentFiles = files.filter(f => f.endsWith('.html'));
  console.log('Components:', componentFiles);

  async function loadComponent(filename) {
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

    return { mod, filepath, key };
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

  const galleryInfo = await loadComponent('gallery.html') || await loadComponent('button.html');
  
  let componentState = {};
  let mod = null;
  let filepath = null;
  
  if (galleryInfo) {
    mod = galleryInfo.mod;
    filepath = galleryInfo.filepath;
    const result = await renderComponent(mod, filepath);
    if (result && result.data) {
      componentState = result.data;
    }
  }

  createApplication({
    onClose: () => {
      console.log('Closed');
    },
  }, ({ self, open }) => {
    let rootWidget = null;
    let contentWidget = null;
    let dispose = null;
    
    function render() {
      if (!mod || !filepath) return null;
      
      const ctx = {
        depth: 0,
        stack: [],
        scope: {},
        mixins: new Map(),
        tag: null,
        route: {},
        hooks: GTK_HOOKS,
      };
      
      return Template.resolve(mod, filepath, ctx, {}, null).then(result => {
        if (result && result.body && result.body[0]) {
          return vnodeToWidget(result.body[0], componentState);
        }
        return null;
      });
    }
    
    async function updateContent() {
      const newWidget = await render();
      if (newWidget && contentWidget) {
        const parent = contentWidget.get_parent();
        if (parent) {
          parent.remove(contentWidget);
          parent.append(newWidget);
        }
        contentWidget = newWidget;
      }
    }
    
    open(() => {
      dispose = subscribeToSignals(componentState, updateContent);
      
      render().then(newWidget => {
        contentWidget = newWidget;
        
        if (!contentWidget) {
          contentWidget = vstack([
            label('Jamrock Explorer'),
            label(`Found ${componentFiles.length} components`),
            ...componentFiles.slice(0, 5).map(f => label(`  • ${f}`)),
          ]);
        }
        
        const parent = rootWidget;
        if (parent && contentWidget) {
          parent.append(contentWidget);
        }
      });
      
      rootWidget = vstack([
        label('Jamrock Explorer'),
        label('─'.repeat(20)),
      ]);
      
      return rootWidget;
    });
  });
}

export async function startExplorer(env, options) {
  createExplorer({ env, options });
}
