import { createApplication, vstack, label, button, box, hstack } from '../../dist/gtk.mjs';
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
  hstack: (children, props) => box(children, { orientation: 1, ...props }),
  box,
  label: (text, props) => label(text, props),
  button: (text, props) => button(text, props),
};

function vnodeToWidget(vnode) {
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

  const cleanAttrs = { ...attrs };
  delete cleanAttrs['@location'];
  delete cleanAttrs['@source'];
  delete cleanAttrs['@on:click'];
  delete cleanAttrs['name'];
  delete cleanAttrs['value'];

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
    const { onclick, ...rest } = cleanAttrs;
    const buttonText = typeof text === 'string' ? text : typeof text === 'number' ? String(text) : 'Button';
    return factory(buttonText, { onClick: onclick, ...rest });
  }

  const childWidgets = Array.isArray(children)
    ? children.map(c => vnodeToWidget(c)).filter(Boolean)
    : [];

  return factory(childWidgets, cleanAttrs);
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

    const result = await Template.resolve(mod, filepath, ctx, {}, null);
    return result;
  }

  const buttonInfo = await loadComponent('button.html');
  
  let vnode = null;
  if (buttonInfo) {
    const result = await renderComponent(buttonInfo.mod, buttonInfo.filepath);
    if (result && result.body && result.body[0]) {
      vnode = result.body[0];
    }
  }

  createApplication({
    onClose: () => {
      console.log('Closed');
    },
  }, ({ self, open }) => {
    open(() => {
      let widget;
      if (vnode) {
        try {
          widget = vnodeToWidget(vnode);
        } catch (e) {
          console.error('Error creating widget:', e);
          widget = vstack([
            label('Error creating widget'),
            label(e.message),
          ]);
        }
      }
      
      if (!widget) {
        widget = vstack([
          label('Jamrock Explorer'),
          label(`Found ${componentFiles.length} components`),
          ...componentFiles.slice(0, 5).map(f => label(`  • ${f}`)),
        ]);
      }
      
      return vstack([
        label('Jamrock Explorer'),
        label('─'.repeat(20)),
        widget,
      ]);
    });
  });
}

export async function startExplorer(env, options) {
  createExplorer({ env, options });
}
