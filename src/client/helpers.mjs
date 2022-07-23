import { raf, mount } from 'somedom';
import { createRender } from './component.mjs';
import { Fragment } from './fragment.mjs';
import { isArray } from '../utils.mjs';
import { Browser } from './browser.mjs';

const _ = createRender(Fragment);

export const $ = _.$;
export const $$ = _.$$;

export const STYLE_TAG = $(['style', null]);

export function lookup(key, node) {
  let root = node;
  while (root && root.parentNode) {
    if (root === document.body) break;
    if (key in root.dataset) return root;
    root = root.parentNode;
  }
}

export function defer() {
  let resolve;
  let reject;

  const deferred = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  deferred.resolve = resolve;
  deferred.reject = reject;
  return deferred;
}

export function after(el, cmd) {
  if (typeof cmd !== 'string') return;
  raf(() => {
    cmd.split(/\s*\|\s*/).forEach(s => {
      const [action, ...elements] = s.split(/\s+/);

      switch (action) {
        case 'select':
          if (elements[0]) {
            el.elements[elements[0]].select();
          } else if (document.activeElement) {
            if (document.activeElement.tagName === 'INPUT') {
              document.activeElement.select();
            }
          }
          break;

        case 'true': case 'data-async': break;
        case 'reset': el.reset(); break;

        case 'clear': {
          elements.forEach(name => {
            if (el.elements[name]) el.elements[name].value = '';
          });
          break;
        }
        default:
          throw new Error(`Unknown action '${action}'`);
      }
    });
  });
}

export async function sync(fragments) {
  for (const frag of fragments) {
    const ref = await Fragment.from(frag.id);
    await patch(ref.target, ref.vnode, ref.vnode = frag.children, null, $); // eslint-disable-line
  }
}

export async function dom(el, vdom, kind) {
  if (kind === 'live' || Browser.__dirty) el.__vnode = null;

  try {
    if (el.__vnode) {
      await patch(el, el.__vnode, el.__vnode = vdom, null, $); // eslint-disable-line
    } else {
      while (el.firstChild) el.removeChild(el.firstChild);
      mount(el, el.__vnode = vdom, null, $);
    }
  } catch (e) {
    console.debug('E_VIEW', e, el, el.__vnode);
  }
}

export function css(code) {
  if (STYLE_TAG.textContent !== code) {
    STYLE_TAG.textContent = code;
  }
  STYLE_TAG.__dirty = true;
}

export async function set(head, _css) {
  try {
    await dom(document.head, head);

    if (!STYLE_TAG.isConnected) {
      document.head.appendChild(STYLE_TAG);
    }
    css(_css);
  } catch (e) {
    console.debug('E_SET', e, head, _css);
  }
}

export function js(code) {
  if (isArray(code)) {
    return code.forEach(js);
  }

  const script = document.createElement('script');

  if (code.indexOf('/*!@@module*/') === 0) {
    script.textContent = code.substr(13);
    script.type = 'module';
  } else {
    script.textContent = code;
  }

  raf(() => {
    try {
      document.head.appendChild(script);
    } finally {
      document.head.removeChild(script);
    }
  });
}
