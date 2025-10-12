import { toNodes, toAttrs } from '../utils/client.mjs';
import { LiveSocket } from './livesocket.mjs';
import { EventHub } from './events.mjs';

export class Browser {
  constructor(state, prefix, version) {
    console.info('check', state.patch, version);

    const actions = new Proxy({}, {
      get: (_, prop) => (...args) => this.call(prop, ...args),
    });

    this.paused = false;
    this.prefix = prefix;
    this.version = version;
    this.actions = actions;
    this.csrf_token = state.csrf;
    this.request_uuid = state.uuid;
    this.request_method = state.method;

    this.warn = (e, msg) => import('./debugger.mjs').then(({ showDebug }) => showDebug(e, msg));

    this.call = async (key, ...args) => {
      for (const [mod, calls] of Object.entries(window.Jamrock.Components.calls)) {
        if (calls.includes(key)) {
          console.log('[REMOTE CALL]', mod, key, args);
          return true;
        }
      }
      throw new Error(`Invoked action is not defined, given '${key}'`);
    };

    this.sync = async (payload, callback, element) => {
      const { scrollLeft, scrollTop } = document.documentElement;

      window.Jamrock.LiveSocket.start();
      window.Jamrock.Components.off();

      try {
        await this.runtime();

        if (this.teardown) this.teardown();

        // normalize keys!!
        // FIXME: how to patch fragments?
        window.Jamrock.Components.set(payload._, payload.$, payload.scripts, payload.fragments);

        Object.values(payload.styles)
          .forEach(set => set.forEach(_ => {
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
        window.Jamrock.Components.on();
      }
    };

    this.attrs = (el, props) => {
      if (!el) return console.log({ props });
      el.getAttributeNames().forEach(name => {
        if (!(name in props)) el.removeAttribute(name);
      });
      Object.entries(props).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    };

    this.patch = (el, vdom, force) => {
      if (!el) return console.log({ vdom });
      const { patchNode } = window.Jamrock.Runtime;

      if (!el.__vnode && !force) {
        while (el.firstChild
          && el.firstChild.nodeType === 3
          && !el.firstChild.nodeValue.trim()) el.removeChild(el.firstChild);

        el.__vnode = this.children(el)[2];
      }

      // console.log('[PATCH]', el.__vnode, vdom);
      return patchNode(el, !force ? el.__vnode : null, el.__vnode = vdom); // eslint-disable-line
    };

    this.scripts = js => {
      if (!js) return;
      Object.values(js).forEach(set => {
        set.forEach(([ref, id]) => {
          if (!ref) window.Jamrock.Components.import(id);
        });
      });
    };

    this.fetch = (url, data, method, headers) => fetch(url, {
      body: (['POST', 'PUT', 'PATCH'].includes(method) && data) || undefined,
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

    let block;
    this.reload = (cb, replay) => {
      if (block || this.paused) return setTimeout(() => cb && cb(), 120);
      window.Jamrock.EventHub.loadURL(document.activeElement,
        location.pathname,
        undefined,
        replay ? this.request_method : undefined,
        undefined,
        undefined,
        cb);
    };

    this.attribs = node => toAttrs(node);
    this.children = node => toNodes(node, true);

    this.pause = () => {
      this.paused = true;
      if (window.Jamrock.Fragment) window.Jamrock.Fragment.teardown();
    };
    this.resume = () => {
      this.paused = false;

      clearTimeout(block);
      block = setTimeout(() => {
        block = null;
      }, 90);

      if (window.Jamrock.Fragment) window.Jamrock.Fragment.subscribe();
    };

    this.runtime = async () => {
      if (!window.Jamrock.Runtime) {
        const { createRender, createFragment } = await import('./elements.mjs');
        const { patchNode, createElement, renderToElement } = createRender();

        window.Jamrock.Fragment = createFragment({
          browser: this,
          patchNode,
          createElement,
        });

        window.Jamrock.Runtime = {
          renderToElement,
          createElement,
          patchNode,
        };
      }
    };
  }

  static init(Components, version, prefix, state, data) {
    const browser = new Browser(state, prefix, version);
    const sockets = new LiveSocket(browser);
    const events = new EventHub(sockets);

    events.start();
    sockets.start();

    window.Jamrock = {
      Browser: browser,
      EventHub: events,
      LiveSocket: sockets,
      Components: new Components(browser, prefix, data),
    };
  }
}
