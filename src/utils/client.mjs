import { isNot as not, isArray as arr, isPlain as plain, isString as str, isScalar as scalar, isFunction as func } from 'somedom/ssr';

export {
  toNodes, toAttrs,
  bind, mount, patch, render, styles, classes, listeners, attributes,
} from 'somedom/ssr';

import { Is } from './base.mjs';

const _Is = Object.assign(Is, {
  not, str, arr, func, plain, scalar,
});

export { _Is as Is };
export { pick, noop, sleep } from './shared.mjs';

// we transform well-known entities into unicode (?)
// since serialized text is already encoded on the back-end
// (see: src/markup/utils.mjs#encode for more details)
export function decode(v) {
  const txt = new DOMParser().parseFromString(v, 'text/html');
  return txt.documentElement.textContent;
}

export function updatePage(title, url) {
  if (!url || url === location.href) return;
  history.pushState(null, title, url);
}

export function spaNavigate(callback) {
  return document.startViewTransition
    ? document.startViewTransition(callback).finished
    : callback();
}

export function findNodes(key, node, skip) {
  if (!node) return;
  let root = node;
  while (root && root.parentNode) {
    if (root === document.body) break;
    if (key in root.dataset) {
      if (skip > 0) {
        root = root.parentNode;
        skip--;
        continue;
      }
      return root;
    }
    if ('fragment' in root.dataset) break;
    if (['FORM', 'X-FRAGMENT'].includes(root.tagName)) break;
    root = root.parentNode;
  }
}
