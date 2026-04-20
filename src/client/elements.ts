import {
  bind, mount, patch, render, styles, classes, listeners, attributes,
} from '../utils/client.ts';
import { effect } from 'somedom';

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
    __if__: (props: any, children: any) => {
      const anchor = document.createComment('if') as Comment & { _signalDispose?: any };
      const cond = props.__cond;
      const then = props.__then;
      const else_ = props.__else;
      const branches = props.__branches || [];
      let currentNodes: Node[] = [];

      const update = () => {
        const value = cond();

        let branchThunk: (() => unknown) | undefined;
        if (value) {
          branchThunk = then;
        } else {
          for (const block of branches) {
            const result = block && block();
            if (result) {
              branchThunk = () => result;
              break;
            }
          }
          if (!branchThunk && else_) branchThunk = else_;
        }

        for (const node of currentNodes) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
        currentNodes = [];

        if (branchThunk) {
          const result = branchThunk();
          const container = document.createElement('div');
          mount(container, result, null, $);
          while (container.firstChild) {
            currentNodes.push(container.firstChild);
            anchor.parentNode?.insertBefore(container.firstChild, anchor.nextSibling);
          }
        }
      };

      const dispose = effect(() => {
        cond();
        update();
      });
      anchor._signalDispose = dispose;
      return anchor;
    },
    __each__: (props: any, children: any) => {
      const anchor = document.createComment('each') as Comment & { _signalDispose?: any };
      const subj = props.__subj;
      const body = props.__body;
      const fallback = props.__fallback;
      let currentNodes: Node[] = [];

      const update = () => {
        const items = subj();

        for (const node of currentNodes) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
        currentNodes = [];

        let input: any[] = [];
        if (typeof items === 'object' && !Array.isArray(items)) {
          input = Object.entries(items);
        } else if (Array.isArray(items) || (items && typeof items[Symbol.iterator] === 'function')) {
          input = [...items];
        } else if (typeof items === 'number') {
          input = Array.from({ length: items }, (_, i) => i);
        }

        if (input.length === 0 && fallback) {
          const result = fallback();
          const container = document.createElement('div');
          mount(container, result, null, $);
          while (container.firstChild) {
            currentNodes.push(container.firstChild);
            anchor.parentNode?.insertBefore(container.firstChild, anchor.nextSibling);
          }
        } else {
          for (let i = 0; i < input.length; i++) {
            const result = body(input[i] instanceof Array ? input[i][1] : input[i], i);
            const container = document.createElement('div');
            if (Array.isArray(result)) {
              for (const item of result) {
                mount(container, item, null, $);
              }
            } else if (result != null && result !== false) {
              mount(container, result, null, $);
            }
            while (container.firstChild) {
              currentNodes.push(container.firstChild);
              anchor.parentNode?.insertBefore(container.firstChild, anchor.nextSibling);
            }
          }
        }
      };

      const dispose = effect(() => {
        subj();
        update();
      });
      anchor._signalDispose = dispose;
      return anchor;
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
