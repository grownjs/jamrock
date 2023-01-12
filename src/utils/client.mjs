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
