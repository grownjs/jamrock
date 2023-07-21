// import { renderAsync } from '../render/async.mjs';
const renderAsync = () => null;

export function getChildren(mod, slots, props, context) {
  function _render(chunk, locals) {
    if (!chunk.resolve) locals = { $$props: locals, $$slots: slots };
    return renderAsync(chunk, { ...props, ...locals }, _render, { ...context, client: true });
  }
  return _render({ render: mod.render, _slots: slots }, props);
}

export function wrapComponent(render) {
  return this.createContext(render, (sync, update) => {
    let deferred = Promise.resolve();
    update(self => {
      if (!self.equals()) {
        self.loop();
        deferred = self.result.then(self.patch);
      }
      return deferred;
    });
    return sync();
  });
}

export function clientComponent(mod, context, filepath) {
  const resolver = x => ((x === 'jamrock' && this) || ((context && context.load) ? context.load(x) : import(x)));
  const mount = async (el, opts) => {
    if (el.current) {
      throw new Error('Component already mounted');
    }

    let vnode;
    let next;
    if (!mod.resolve) {
      next = () => getChildren(mod, opts.slots, { ...opts.props }, context);
    } else {
      const $$module = { filepath, module: mod, element: el };
      const $$state = { ...opts.props, $$props: opts.props, $$slots: opts.slots };

      const self = await mod.resolve.call($$module, $$state, mod.src, null, null, null, resolver);

      let state = await self.state.result;
      next = () => getChildren(mod, opts.slots, { ...opts.props, ...state }, context);

      self.state.patch = peek => {
        el.current = state = { ...state, ...peek };

        // eslint-disable-next-line no-return-assign
        return typeof process !== 'undefined'
          ? this.patchNode(el, vnode, vnode = next())
          // eslint-disable-next-line no-return-assign
          : requestAnimationFrame(() => this.patchNode(el, vnode, vnode = next()));
      };

      // console.log({ state, $$state });
      el.current = state;
      el.__store = self;
    }

    el.__update = (_mod, _opts) => {
      el.current = null;
      // console.log({ _opts }, el.current, el.__store);
      clientComponent.call(this, _mod, context).mount(el, _opts);
    };

    if (context && context.sync) {
      context.sync(vnode = next());
    } else {
      this.renderToElement(el, vnode = next());
    }
    return el;
  };
  return { mount };
}

export function mountableComponent(mod, context, filepath) {
  return clientComponent.call(this, mod, context, filepath);
}
