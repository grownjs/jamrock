import { executeAsync } from '../render/async.ts';

export function wrapComponent(this: any, _: any, loop: any): any {
  return this.createContext(loop, (sync: any, update: any) => {
    let deferred = Promise.resolve();
    update((self: any) => {
      if (!self.equals()) {
        deferred = deferred
          .then(() => self.loop())
          .then((data: any) => self.patch(data));
      }
      return deferred;
    });
    return sync();
  });
}

export function clientComponent(this: any, mod: any, context: any, filepath?: string): { mount: (el: any, props?: any, _events?: any) => Promise<any> } {
  if (!mod) {
    console.log('E_MOD', { context, filepath });
    return { mount: (el: any) => el };
  }

  const loader = (x: string) => (x === 'jamrock' ? this : context.loader?.(x) || import(x));
  const render = executeAsync(null, loader, async (child: any, props: any) => {
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
    return (render as any)(child.__template, data, child.__src);
  });
  const next = (data: any) => (render as any)(mod.__template, data, mod.__src);
  const mount = async (el: any, props?: any, _events?: any) => {
    if (el.__state) {
      throw new Error('Component already mounted');
    }

    let vnode: any;
    if (mod.__handler) {
      const main = await mod.__handler({ ...props }, loader, el);
      const store = await main.__self();
      const data = await store.loop();

      store.patch = async (peek: any) => {
        Object.assign(el.__state, peek.__scope);
        const patch = await next(el.__state);
        el.current = peek.__default;

        // eslint-disable-next-line no-return-assign
        return typeof process !== 'undefined'
          ? this.patchNode(el, vnode, vnode = patch)
          // eslint-disable-next-line no-return-assign
          : requestAnimationFrame(() => this.patchNode(el, vnode, vnode = patch));
      };

      if (el.__store) el.__store.clear();
      el.current = data.__default;
      el.__state = { ...props, ...data.__scope };
      el.__store = store;
    }

    el.__defer = el.__defer || Promise.resolve();
    el.__update = (_mod: any, _props: any) => {
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

export function mountableComponent(this: any, mod: any, context: any, filepath?: string): { mount: (el: any, props?: any, _events?: any) => Promise<any> } {
  return clientComponent.call(this, mod, context, filepath);
}
