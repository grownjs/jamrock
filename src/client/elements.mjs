import {
  bind, mount, patch, render, styles, classes, listeners, attributes,
} from '../utils/client.mjs';

export * from './fragment.mjs';

export function createRender() {
  const $ = bind(render, listeners(), attributes({
    class: classes,
    style: styles,
  }), [{
    element: (props, children) => {
      const tag = props.tag;
      delete props.tag;
      return [tag, props, children];
    },
    fragment: (props, children) => {
      if (props['@html']) {
        const doc = document.createDocumentFragment();
        const div = document.createElement('div');

        div.innerHTML = props['@html'];
        [].slice.call(div.childNodes).forEach(node => {
          doc.appendChild(node);
        });
        return doc;
      }
      return children;
    },
  }]);

  const $$ = (target, prev, next, svg) => patch(target, prev, next, svg, $);
  const $$$ = (el, vnode) => mount(el, vnode, null, $);

  return {
    patchNode: $$,
    createElement: $,
    renderToElement: $$$,
  };
}
