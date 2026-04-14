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

export async function createExplorer({ env, options }) {
  console.log('Jamrock Explorer');
  console.log('Source:', options.src);

  await env.compiler.reload();

  const files = Object.keys(env.files);
  console.log('Files:', files);

  let buttonModule;
  let buttonFile;
  try {
    const key = files.find(f => f.includes('button.html'));
    buttonModule = env.locate(key);
    buttonFile = env.files[key].filepath;
    console.log('Loaded button module:', buttonModule.__src);
  } catch (e) {
    console.error('Could not load button.html:', e.message);
  }

  let widget;
  if (buttonModule && buttonModule.__template) {
    const ctx = {
      depth: 0,
      stack: [],
      scope: {},
      mixins: new Map(),
      tag: null,
      route: {},
    };

    const result = await Template.resolve(buttonModule, buttonFile, ctx, {}, null);
    console.log('Result:', result);

    const vnode = result.body[0];
    widget = vnodeToWidget(vnode);
  }

  createApplication({
    onClose: () => console.log('Closed'),
  }, ({ self, open }) => {
    open(() => {
      if (widget) {
        return vstack([
          label('Jamrock Explorer'),
          label(`Loaded: ${buttonModule.__src}`),
          widget,
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
