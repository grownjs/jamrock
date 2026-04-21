import { executeAsync } from '../render/async.ts';

export function clientComponent(this: any, mod: any, context: any): { mount: (el: any, props?: any, _events?: any) => Promise<any> } {
  if (!mod) {
    return { mount: (el: any) => el };
  }

  const loader = (x: string) => (x === 'jamrock' ? this : context.loader?.(x) || import(x));
  const render = executeAsync(null, loader, async (child: any, props: any) => {
    if (!child) {
      return [];
    }

    let data = props;
    return (render as any)(child.__vdom, data, child.__src);
  });
  const next = (data: any) => (render as any)(mod.__vdom, data, mod.__src);
  const mount = async (el: any, props?: any, _events?: any) => {
    if (el.__state) {
      throw new Error('Component already mounted');
    }

    let vnode: any;
    if (mod.__handler) {
      const main = await mod.__handler({ ...props }, loader, el);
      const data = main.__context ? main.__context() : { __scope: {}, __default: null };

      el.current = data.__default;
      el.__state = { ...props, ...data.__scope };
    }

    el.__defer = el.__defer || Promise.resolve();
    el.__update = (_mod: any, _props: any) => {
      el.__state = null;
      el.__defer = el.__defer
        .then(() => clientComponent.call(this, _mod, context).mount(el, _props));
    };

    vnode = await next(el.__state);

    if (!el.__vnode) {
      if (el.childNodes.length > 0) {
        this.hydrateToElement(el, vnode);
      } else {
        this.renderToElement(el, vnode);
      }
      el.__vnode = vnode;
    } else if (context?.sync) {
      context.sync(vnode, _events);
      el.__vnode = vnode;
    }

    return el;
  };
  return { mount };
}

export function mountableComponent(this: any, mod: any, context: any): { mount: (el: any, props?: any, _events?: any) => Promise<any> } {
  return clientComponent.call(this, mod, context);
}