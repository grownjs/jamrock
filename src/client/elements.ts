import {
  bind, mount, patch, render, styles, classes, listeners, attributes,
} from '../utils/client.ts';

export * from './fragment.ts';

export function createRender(): { patchNode: any; createElement: any; renderToElement: any } {
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
        // If @html is already a vnode (array), return it directly
        if (Array.isArray(props['@html'])) return props['@html'];
        const template = document.createElement('template');
        // In real browsers, template.content is a DocumentFragment.
        // In virtual DOM environments (e.g. somedom SSR shim), template.content is undefined.
        // Fall back to setting innerHTML on a span so somedom renders it as raw HTML.
        if ('content' in template) {
          template.innerHTML = String(props['@html']);
          return template.content;
        }
        // Virtual DOM fallback: wrap in a span with @html attribute
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
  }]);

  const $$ = (target: any, prev: any, next: any, svg?: any) => patch(target, prev, next, svg, $);
  const $$$ = (el: any, vnode: any) => mount(el, vnode, null, $);

  return {
    patchNode: $$,
    createElement: $,
    renderToElement: $$$,
  };
}
