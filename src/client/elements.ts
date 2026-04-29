import { computed } from 'somedom';
import * as somedom from 'somedom';

const hydrateElement: any = (somedom as any).hydrate;
import {
  bind, mount, patch, render, styles, classes, listeners, attributes,
} from '../utils/client.ts';

// Normalize vdom from Jamrock's [tag, props, children_array] format to
// somedom's expected [tag, props, child1, child2, ...] (spread) format.
// Jamrock's $$.e always produces [tag, props, childrenArray] (3 elements),
// but somedom's hydrateElement uses vnode.slice(2) to get children, which
// returns [[childrenArray]] instead of [child1, child2, ...].
function normalizeForHydrate(vnode: any): any {
  if (!Array.isArray(vnode)) return vnode;
  if (typeof vnode[0] === 'string'
    && vnode[1] !== null && typeof vnode[1] === 'object' && !Array.isArray(vnode[1])
    && vnode.length === 3 && Array.isArray(vnode[2])) {
    const [tag, props, children] = vnode;
    return [tag, props, ...children.map(normalizeForHydrate)];
  }
  return vnode.map(normalizeForHydrate);
}

export * from './fragment.ts';

export function createRender(): { patchNode: any; createElement: any; renderToElement: any; hydrateToElement: any } {
  const $ = bind(render, listeners(), attributes({
    class: classes,
    style: styles,
  }), [{
    element: (props: any, children: any) => {
      const tag = props.tag;
      delete props.tag;
      return [tag, props, children];
    },
    fragment: (props: any, children: any) => {
      if (props['@html']) {
        if (!props['@html']) return null;
        if (Array.isArray(props['@html'])) return props['@html'];
        const template = document.createElement('template');
        if ('content' in template) {
          template.innerHTML = String(props['@html']);
          return template.content;
        }
        const span = document.createElement('span');
        span.innerHTML = String(props['@html']);
        return span;
      }
      if (props['d:html']) {
        const signal = props['d:html'];
        if (!signal || !signal.value) return null;
        const tag = props.tag || 'div';
        delete props.tag;
        return [tag, { 'd:html': signal }, ...children];
      }
      return children;
    },
  }, {
    'if-block': (props: any) => {
      const cond = props.__cond;
      const then = props.__then;
      const else_ = props.__else;
      const branches = props.__branches || [];

      return computed(() => {
        const value = cond();
        let result;
        if (value) {
          result = then();
        } else {
          for (const block of branches) {
            const r = block && block();
            if (r) {
              result = typeof r === 'function' ? r() : r;
              break;
            }
          }
          if (result === undefined) result = else_ ? else_() : null;
        }

        if (result === undefined || result === null || result === false) return null;
        if (Array.isArray(result) && result.length === 0) return null;
        if (Array.isArray(result) && result.length === 1) return result[0];
        return ['slot', {}, ...result];
      });
    },
    'each-block': (props: any) => {
      const subj = props.__subj;
      const body = props.__body;
      const fallback = props.__fallback;

      return computed(() => {
        const items = subj();

        let input: any[] = [];
        if (typeof items === 'object' && !Array.isArray(items)) {
          input = Object.entries(items);
        } else if (Array.isArray(items) || (items && typeof items[Symbol.iterator] === 'function')) {
          input = [...items];
        } else if (typeof items === 'number') {
          input = Array.from({ length: items }, (_, i) => i);
        }

        if (input.length === 0 && fallback) return fallback();

        const results: any[] = [];
        for (let i = 0; i < input.length; i++) {
          const result = body(input[i] instanceof Array ? input[i][1] : input[i], i);
          if (result != null && result !== false) {
            if (Array.isArray(result)) results.push(...result);
            else results.push(result);
          }
        }

        if (results.length === 0) return null;
        if (results.length === 1) return results[0];
        return ['slot', {}, ...results];
      });
    },
  }]);

  const $$ = (target: any, prev: any, next: any, svg?: any) => patch(target, prev, next, svg, $);
  const $$$ = (el: any, vnode: any) => mount(el, vnode, null, $);
  const $$$$ = (el: any, vnode: any) => hydrateElement(el, normalizeForHydrate(vnode), null, $);

  return {
    patchNode: $$,
    createElement: $,
    renderToElement: $$$,
    hydrateToElement: $$$$,
  };
}
