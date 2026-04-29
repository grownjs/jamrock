import { isNot as not, isArray as arr, isPlain as plain, isString as str, isScalar as scalar, isFunction as func, isSignal } from 'somedom';

export {
  toNodes, toAttrs,
  bind, mount, patch, render, styles, classes, listeners, attributes,
} from 'somedom';

export { isSignal };

import { Is } from './base.ts';

const _Is = Object.assign(Is, {
  not, str, arr, func, plain, scalar,
});

export { _Is as Is };
export { pick, noop, sleep } from './shared.ts';

// we transform well-known entities into unicode (?)
// since serialized text is already encoded on the back-end
// (see: src/markup/utils.mjs#encode for more details)
export function decode(v: string): string {
  const txt = new DOMParser().parseFromString(v, 'text/html');
  return txt.documentElement.textContent!;
}

export function updatePage(title: string, url: string): void {
  if (!url || url === location.href) return;
  history.pushState(null, title, url);
}

export function spaNavigate(callback: () => unknown): unknown {
  return (document as any).startViewTransition
    ? (document as any).startViewTransition(callback).finished
    : callback();
}

export function findNodes(key: string, node: Element | null, skip?: number): Element | undefined {
  if (!node) return;
  let root: Element | null = node;
  while (root && root.parentNode) {
    if (root === document.body) break;
    if (key in (root as HTMLElement).dataset) {
      if (skip && skip > 0) {
        root = root.parentNode as Element;
        skip--;
        continue;
      }
      return root;
    }
    if ('fragment' in (root as HTMLElement).dataset) break;
    if (['FORM', 'X-FRAGMENT'].includes(root.tagName)) break;
    root = root.parentNode as Element;
  }
}
