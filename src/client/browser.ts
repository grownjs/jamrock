import { toNodes, toAttrs } from '../utils/client.ts';
import { LiveSocket } from './livesocket.ts';
import { EventHub } from './events.ts';
import { rpc, setPrefix } from './rpc.ts';

export class Browser {
  declare paused: boolean;
  declare prefix: string;
  declare version: string;
  declare actions: any;
  declare csrf_token: string;
  declare request_uuid: string;
  declare request_method: string;
  declare request_failure: boolean;
  declare request_success: boolean;
  declare headless: boolean;
  declare teardown: (() => void) | undefined;
  declare warn: (e: any, msg: string) => Promise<void>;
  declare call: (key: string, ...args: any[]) => Promise<boolean>;
  declare sync: (payload: any, callback: (fn: () => any) => any, element?: string) => Promise<void>;
  declare attrs: (el: Element | null, props: Record<string, string>) => void;
  declare patch: (el: any, vdom: any, force?: boolean) => any;
  declare scripts: (js: any) => void;
  declare fetch: (url: string, data: any, method?: string, headers?: any) => Promise<Response>;
  declare reload: (cb?: (() => void) | null, replay?: boolean) => void;
  declare attribs: (node: Node) => any;
  declare children: (node: Node) => any;
  declare pause: () => void;
  declare resume: () => void;
  declare runtime: () => Promise<void>;

  constructor(state: any, prefix: string, version: string) {
    console.info('check', state.patch, version);

    const actions = new Proxy({}, {
      get: (_: any, prop: string) => (...args: any[]) => this.call(prop, ...args),
    });

    this.paused = false;
    this.prefix = prefix;
    this.version = version;
    this.actions = actions;
    this.csrf_token = state.csrf;
    setPrefix(prefix);
    this.request_uuid = state.uuid;
    this.request_method = state.method;

    this.warn = (e: any, msg: string) => import('./debugger.ts').then(({ showDebug }) => showDebug(e, msg));

    this.call = async (key: string, ...args: any[]) => {
      for (const [mod, calls] of Object.entries((window as any).Jamrock.Components.calls)) {
        if ((calls as string[]).includes(key)) {
          return rpc(`${mod}/${key}`, ...args);
        }
      }
      throw new Error(`Invoked action is not defined, given '${key}'`);
    };

    this.sync = async (payload: any, callback: (fn: () => any) => any, element?: string) => {
      const { scrollLeft, scrollTop } = document.documentElement;

      (window as any).Jamrock.LiveSocket.start();
      (window as any).Jamrock.Components.off();

      try {
        await this.runtime();

        if (this.teardown) this.teardown();

        // normalize keys!!
        // FIXME: how to patch fragments?
        (window as any).Jamrock.Components.set(payload._, payload.$, payload.scripts, payload.fragments);

        Object.values(payload.styles)
          .forEach((set: any) => set.forEach((_: any) => {
            payload.head.push(['link', { rel: 'stylesheet', href: `${this.prefix}/${_}` }]);
          }));

        this.attrs(document.documentElement, payload.doc);
        this.patch(document.head, payload.head);
        this.attrs(document.body, payload.attrs);

        await callback(() => this.patch(document.body, payload.body));
      } finally {
        if (element) {
          const node = document.getElementById(element);
          if (node) node.scrollIntoView({ behavior: 'smooth' });
        } else {
          document.documentElement.scrollLeft = scrollLeft;
          document.documentElement.scrollTop = scrollTop;
        }
        (window as any).Jamrock.Components.on();
      }
    };

    this.attrs = (el: Element | null, props: Record<string, string>) => {
      if (!el) return console.log({ props });
      el.getAttributeNames().forEach(name => {
        if (!(name in props)) el.removeAttribute(name);
      });
      Object.entries(props).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    };

    this.patch = (el: any, vdom: any, force?: boolean) => {
      if (!el) return console.log({ vdom });
      const { patchNode } = (window as any).Jamrock.Runtime;

      if (!el.__vnode && !force) {
        while (el.firstChild
          && el.firstChild.nodeType === 3
          && !el.firstChild.nodeValue.trim()) el.removeChild(el.firstChild);

        el.__vnode = this.children(el)[2];
      }

      // console.log('[PATCH]', el.__vnode, vdom);
      return patchNode(el, !force ? el.__vnode : null, el.__vnode = vdom); // eslint-disable-line
    };

    this.scripts = (js: any) => {
      if (!js) return;
      Object.values(js).forEach((set: any) => {
        set.forEach(([ref, id]: [any, string]) => {
          if (!ref) (window as any).Jamrock.Components.import(id);
        });
      });
    };

    this.fetch = (url: string, data: any, method?: string, headers?: any) => fetch(url, {
      body: (['POST', 'PUT', 'PATCH'].includes(method!) && data) || undefined,
      method: method || 'GET',
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        'cache-control': 'max-age=0, no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
        'x-requested-with': 'XMLHttpRequest',
        'x-version': this.version,
        'csrf-token': this.csrf_token,
        'request-uuid': this.request_uuid,
        ...headers,
      },
    });

    let block: ReturnType<typeof setTimeout> | null;
    this.reload = (cb?: (() => void) | null, replay?: boolean) => {
      if (block || this.paused) return setTimeout(() => cb && cb(), 120);
      (window as any).Jamrock.EventHub.loadURL(document.activeElement,
        location.pathname,
        undefined,
        replay ? this.request_method : undefined,
        undefined,
        undefined,
        cb);
    };

    this.attribs = (node: Node) => toAttrs(node);
    this.children = (node: Node) => (toNodes as any)(node, true);

    this.pause = () => {
      this.paused = true;
      if ((window as any).Jamrock.Fragment) (window as any).Jamrock.Fragment.teardown();
    };
    this.resume = () => {
      this.paused = false;

      clearTimeout(block!);
      block = setTimeout(() => {
        block = null;
      }, 90);

      if ((window as any).Jamrock.Fragment) (window as any).Jamrock.Fragment.subscribe();
    };

    this.runtime = async () => {
      if (!(window as any).Jamrock.Runtime) {
        const { createRender, createFragment } = await import('./elements.ts');
        const { patchNode, createElement, renderToElement, hydrateToElement } = createRender();

        (window as any).Jamrock.Fragment = createFragment({
          browser: this,
          patchNode,
          createElement,
        });

        (window as any).Jamrock.Runtime = {
          renderToElement,
          hydrateToElement,
          createElement,
          patchNode,
        };
      }
    };
  }

  static init(Components: any, version: string, prefix: string, state: any, data: any): void {
    const browser = new Browser(state, prefix, version);
    const sockets = new LiveSocket(browser);
    const events = new EventHub(sockets);

    events.start();
    sockets.start();

    (window as any).Jamrock = {
      Browser: browser,
      EventHub: events,
      LiveSocket: sockets,
      Components: new Components(browser, prefix, data),
    };
  }
}
