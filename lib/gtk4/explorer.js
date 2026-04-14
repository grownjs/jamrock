import { createApplication, vstack, label, button, box } from '../../dist/gtk.mjs';
import { Template } from '../../dist/main.mjs';
import { path, GLib } from './deps.js';

export const BASE_DIR = GLib.get_current_dir();

const GTK_ELEMENTS = {
  vstack,
  hstack: (children, props) => box(children, { orientation: 1, ...props }),
  box,
  label: (text, props) => label(text, props),
  button: (text, props) => button(text, props),
};

function vnodeToWidget(vnode) {
  if (!vnode) return null;
  if (typeof vnode === 'string') return label(vnode);
  if (!Array.isArray(vnode)) return label(String(vnode));

  const [name, attrs, children] = vnode;
  const factory = GTK_ELEMENTS[name];

  if (!factory) {
    console.warn(`Unknown element: ${name}`);
    return label(`<${name}>`);
  }

  const cleanAttrs = { ...attrs };
  delete cleanAttrs['@location'];

  const childWidgets = Array.isArray(children)
    ? children.map(vnodeToWidget).filter(Boolean)
    : [];

  if (name === 'label') {
    const text = Array.isArray(children) ? children.join('') : (children || '');
    return factory(text, cleanAttrs);
  }

  if (name === 'button') {
    const text = Array.isArray(children) ? children[0] : children || 'Button';
    const { onclick, ...rest } = cleanAttrs;
    return factory(text, { onClick: onclick, ...rest });
  }

  return factory(childWidgets, cleanAttrs);
}

function renderTemplate(template, props = {}) {
  const $$ = {
    $: (value) => {
      if (value == null) return '';
      if (typeof value === 'object' && value.value !== undefined) return value.value;
      return String(value);
    },
    e: (name, attrs, children) => [name, attrs, children],
    block: (fn, name, attrs, children) => [fn.name || name, attrs, children ? children() : []],
  };
  const result = template($$, props);
  return Array.isArray(result) ? result : [result];
}

export async function createExplorer({ env, options }) {
  console.log('Jamrock Explorer');
  console.log('Source:', options.src);

  const files = Object.keys(env.files);
  console.log('Files:', files);

  let buttonModule;
  try {
    const key = files.find(f => f.includes('button.html'));
    console.log('Looking for key:', key);
    const mod = env.files[key];
    console.log('Module:', mod);
    if (mod) {
      const cwd = process.cwd();
      const fullPath = `${cwd}/${mod.filepath}`;
      console.log('Importing:', fullPath);
      const imported = await import(`file://${fullPath}`);
      buttonModule = imported;
      console.log('Imported:', Object.keys(imported));
    }
    console.log('Loaded button module:', buttonModule?.__src);
  } catch (e) {
    console.error('Could not load button.html:', e.message);
  }

  createApplication({
    onClose: () => console.log('Closed'),
  }, ({ self, open }) => {
    open(() => {
      if (buttonModule && buttonModule.__template) {
        const vnodes = renderTemplate(buttonModule.__template);
        console.log('VNodes:', JSON.stringify(vnodes, null, 2));
        return vstack([
          label('Jamrock Explorer'),
          label(`Loaded: ${buttonModule.__src}`),
          vnodeToWidget(vnodes[0]),
        ]);
      }

      return vstack([
        label('Jamrock Explorer'),
        label(`Found ${files.length} files`),
        label('No button.html found'),
      ]);
    });
  });
}

export async function startExplorer(env, options) {
  createExplorer({ env, options });
}
