import { renderSync } from '../render/sync.mjs';
import { Is, noop, pick } from '../utils/client.mjs';

export function getChildren(mod, slots, props, context) {
  function _render(chunk, locals) {
    if (!chunk.resolve) locals = { $$props: locals, $$slots: slots };
    return renderSync(chunk, { ...props, ...locals }, _render, { ...context, client: true });
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

export function slotComponent(cb, props, context) {
  const nodes = [];

  let root;
  return [
    () => ({
      m: (target, anchor) => {
        if (!cb) return;
        root = target;

        // FIXME: I think svelte-slots should be pre-rendered and sent as json,
        // because interaction with jamrock is not expected so js-code is not needed!

        const children = getChildren({ render: cb }, null, props, context);
        const fragment = window.Jamrock.Runtime.createElement(children);

        anchor = anchor || target.childNodes[target.childNodes.length - 1];
        while (anchor && anchor.claim_order > 1) anchor = anchor.previousSibling;

        fragment.childNodes.forEach(node => {
          nodes.push(node);

          if (context.hydrate) {
            target.insertBefore(node, anchor);
            anchor = node;
          } else {
            target.appendChild(node);
          }
        });
      },
      c: noop,
      l: noop,
      d: () => {
        if (!root) return;
        nodes.forEach(node => {
          if (node.isConnected) root.removeChild(node);
        });
        nodes.length = 0;
      },
    }),
    noop,
    noop,
  ];
}

export function svelteComponent(mod, context) {
  const mount = async (el, opts) => {
    if (el.current) {
      throw new Error('Component already mounted');
    }

    const $$slots = Object.keys(opts.slots || {}).reduce((memo, _key) => {
      memo[_key] = slotComponent(opts.slots[_key], opts.props, context);
      return memo;
    }, {});

    if (!context.hydrate) {
      while (el.firstChild) el.removeChild(el.firstChild);
    }

    el.__update = (_mod, _opts) => {
      el.current.$destroy();
      el.current = null;

      svelteComponent(_mod, { ...context, hydrate: false }).mount(el, _opts);
    };

    // eslint-disable-next-line new-cap
    el.current = new mod({
      props: {
        ...pick(opts.props, opts.scope[0]),
        $$slots,
        $$scope: {
          ctx: [],
        },
      },
      target: el,
      hydrate: context.hydrate,
      $$inline: true,
    });
  };
  return { mount };
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

      el.current = state;
      el.__store = self.state;
    }

    el.__update = async (_mod, _opts) => {
      el.current = null;

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
  return Is.func(mod) ? svelteComponent(mod, context) : clientComponent.call(this, mod, context, filepath);
}
