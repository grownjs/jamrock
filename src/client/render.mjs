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

export function clientComponent(mod, context, filepath) {
  if (!mod) {
    console.log('E_MOD', { context, filepath });
    return { mount: el => el };
  }

  const loader = x => (x === 'jamrock' ? this : context.loader?.(x) || import(x));
  const render = executeAsync(null, loader, async (child, props) => {
    // console.log('RENDER?', child, props);
    if (!child) {
      console.log('E_CHILD', props, child);
      return [];
    }

    let data = props;
    if (child.__handler) {
      console.log('CHILD', child);
      // const tpl = await child.__handler(data, loader);
      // const self = await tpl.__self();
      // data = await self.result;
    }
    return render(child.__template, data, child.__src);
  });
  const next = data => render(mod.__template, data, mod.__src);
  const mount = async (el, props, _events) => {
    if (el.__state) {
      throw new Error('Component already mounted');
    }

    let vnode;
    if (mod.__handler) {
      const main = await mod.__handler({ ...props }, loader, el);
      const store = await main.__self();
      const data = await store.loop();

      store.patch = async peek => {
        Object.assign(el.__state, peek.__scope);
        const patch = await next(el.__state);
        el.current = peek.__actions;

        // eslint-disable-next-line no-return-assign
        return typeof process !== 'undefined'
          ? this.patchNode(el, vnode, vnode = patch)
          // eslint-disable-next-line no-return-assign
          : requestAnimationFrame(() => this.patchNode(el, vnode, vnode = patch));
      };

      if (el.__store) el.__store.clear();
      el.current = data.__actions;
      el.__state = { ...props, ...data.__scope };
      el.__store = store;
    }

    el.__defer = el.__defer || Promise.resolve();
    el.__update = (_mod, _props) => {
      console.log('[UPDATE]', _props);
      if (el.__store) el.__store.clear();
      el.__state = null;
      el.__defer = el.__defer
        .then(() => clientComponent.call(this, _mod, context).mount(el, _props));
    };

    // console.log('[RENDER]', props, el.__state);
    vnode = await next(el.__state);

    if (context?.sync) {
      context.sync(vnode, _events);
    } else {
      this.renderToElement(el, vnode);
    }
    return el;
  };
  return { mount };
}

export function mountableComponent(mod, context, filepath) {
  return clientComponent.call(this, mod, context, filepath);
}
