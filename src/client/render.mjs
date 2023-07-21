// import * as util from 'node:util';

import { executeAsync } from '../render/async.mjs';

export function wrapComponent(_, loop) {
  return this.createContext(loop, (sync, update) => {
    let deferred = Promise.resolve();
    update(self => {
      if (!self.equals()) {
        deferred = deferred
          .then(() => self.loop())
          .then(data => self.patch(data));
      }
      return deferred;
    });
    return sync();
  });
}

export function clientComponent(mod, context) {
  const loader = x => (x === 'jamrock' ? this : context.loader?.(x) || import(x));
  const render = executeAsync(loader, async (child, props) => {
    let data = props;
    if (child.__handler) {
      console.log('CHILD', child);
      // const tpl = await child.__handler(data, loader);
      // const self = await tpl.__self();
      // data = await self.result;
    }
    return render(child.__template, data);
  });
  const next = data => render(mod.__template, data);
  const mount = async (el, props) => {
    if (el.current) {
      throw new Error('Component already mounted');
    }

    let vnode;
    if (mod.__handler) {
      const self = await mod.__handler(props, loader);
      const store = await self.__self();
      const data = await store.loop();

      store.patch = async peek => {
        Object.assign(el.current, peek.__scope);

        const patch = await next(el.current);

        // eslint-disable-next-line no-return-assign
        return typeof process !== 'undefined'
          ? this.patchNode(el, vnode, vnode = patch)
          // eslint-disable-next-line no-return-assign
          : requestAnimationFrame(() => this.patchNode(el, vnode, vnode = patch));
      };

      el.current = { ...props, ...data.__scope };
      el.__store = store;
    }

    el.__update = (_mod, _opts) => {
      el.current = null;
      clientComponent.call(this, _mod, context).mount(el, _opts);
    };

    vnode = await next(el.current);

    if (context?.sync) {
      context.sync(vnode);
    } else {
      this.renderToElement(el, vnode);
    }
    return el;
  };
  return { mount };
}

export function mountableComponent(mod, context) {
  return clientComponent.call(this, mod, context);
}
