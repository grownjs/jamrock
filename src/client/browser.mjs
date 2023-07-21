import { toNodes, toAttrs } from '../utils/client.mjs';
import { LiveSocket } from './livesocket.mjs';
import { EventHub } from './events.mjs';

export class Browser {
  constructor(state, version) {
    console.warn('check', state.patch, version);

    this.paused = false;
    this.version = version;
    this.csrf_token = state.csrf;
    this.request_uuid = state.uuid;
    this.request_method = state.method;

    this.warn = (e, msg) => import('./debugger.mjs').then(({ showDebug }) => showDebug(e, msg));

    this.sync = (payload, callback) => {
      window.Jamrock.LiveSocket.start();
      window.Jamrock.Components.off();

      return this.runtime().then(() => {
        if (this.teardown) this.teardown();

        // FIXME: patch fragments?
        console.log('PATCH', payload.fragments);

        this.patch(document.head, payload.head.concat([['style', null, Object.values(payload.styles).join('\n')]]));
        this.attrs(document.documentElement, payload.doc);
        this.attrs(document.body, payload.attrs);
        this.scripts(Object.values(payload.scripts));

        return callback(() => this.patch(document.body, payload.body));
      }).then(() => {
        window.Jamrock.Components.on();
        window.Jamrock.Components.refetch();
      });
    };

    this.attrs = (el, props) => {
      if (!el) return console.log({ props });
      el.getAttributeNames().forEach(name => {
        el.removeAttribute(name);
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

        el.__vnode = el.__vnode || this.children(el);
      }

      return patchNode(el, !force ? el.__vnode : null, el.__vnode = vdom); // eslint-disable-line
    };

    this.scripts = js => {
      if (Array.isArray(js)) {
        return js.forEach(this.scripts);
      }

      const script = document.createElement('script');

      script.textContent = js;
      script.type = 'module';

      requestAnimationFrame(() => {
        try {
          document.head.appendChild(script);
        } finally {
          document.head.removeChild(script);
        }
      });
    };

    this.fetch = (url, data, method, headers) => fetch(url, {
      body: (['POST', 'PUT', 'PATCH'].includes(method) && data) || undefined,
      method: method || 'GET',
      credentials: 'same-origin',
      headers: {
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
      block = setTimeout(() => { block = null; }, 260);

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

  static init(Components, version, state, cb) {
    const browser = new Browser(state, version);
    const sockets = new LiveSocket(browser);
    const events = new EventHub(sockets);

    events.start();
    sockets.start();

    window.Jamrock = {
      Browser: browser,
      EventHub: events,
      LiveSocket: sockets,
      Components: new Components(browser, cb),
    };
  }
}
