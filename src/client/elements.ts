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
        const template = document.createElement('template');
        template.innerHTML = props['@html'];
        return template.content;
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
