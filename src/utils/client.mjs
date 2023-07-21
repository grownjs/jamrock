import { isNot as not, isArray as arr, isPlain as plain, isString as str, isScalar as scalar, isFunction as func } from 'somedom/ssr';

export {
  toNodes, toAttrs,
  bind, mount, patch, render, styles, classes, listeners, attributes,
} from 'somedom/ssr';

import { Is as is } from './shared.mjs';

export const Is = Object.assign(is, {
  not, str, arr, func, plain, scalar,
});

export { pick, noop, sleep, toProps } from './shared.mjs';

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

export function findNodes(key, node) {
  if (!node) return;
  if (node[`@${key}`]) return node[`@${key}`];

  let root = node;
  while (root && root.parentNode) {
    if (root === document.body) break;
    if (key in root.dataset) {
      node[`@${key}`] = root;
      return root;
    }
    if ('fragment' in root.dataset) break;
    if (['FORM', 'X-FRAGMENT'].includes(root.tagName)) break;
    root = root.parentNode;
  }
}
