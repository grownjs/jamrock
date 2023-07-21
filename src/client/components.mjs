import { onError, useRef, useMemo, useState, useEffect, createContext } from 'nohooks';

import { wrapComponent, mountableComponent } from './render.mjs';
import { Is, sleep } from '../utils/client.mjs';

const HAS_INTER_OBSERVERS = 'IntersectionObserver' in window;
const HAS_REQUEST_IDLE = 'requestIdleCallback' in window;
const HAS_MATCH_MEDIA = 'matchMedia' in window;
const HAS_CONNECTION = 'connection' in navigator;
const DEFAULT_EVENTS = ['click', 'focusin', 'touchstart'];
const CONDITIONS_MAP = ['idle', 'visible', 'media', 'savedata', 'interaction'];

export class Conditions {
  static is(node) {
    return (node.dataset && ('component' in node.dataset || 'enhance' in node.dataset || 'reset' in node.dataset)) || Is.func(node.__destroy);
  }

  static has(node) {
    // eslint-disable-next-line guard-for-in
    for (const key in node.dataset) {
      if (key.indexOf('use:') === 0 || key.indexOf('is:') === 0) return true;
      if (key.indexOf('on:') === 0 && CONDITIONS_MAP.includes(key.substr(3))) return true;
    }
  }

  static get(node) {
    const hooks = [];

    Object.keys(node.dataset).forEach(key => {
      if (key.indexOf('is:') === 0) hooks.push(['reset', { attr: key.substr(3) }]);
      if (key.indexOf('use:') === 0) hooks.push(['hook', { name: key.substr(4), source: node.dataset[key] }]);
      if (key.indexOf('on:') === 0 && CONDITIONS_MAP.includes(key.substr(3))) hooks.push([key.substr(3), node.dataset[key]]);
    });
    return hooks;
  }

  static map(node) {
    return Conditions.get(node).reduce((memo, [k, v]) => {
      memo.push(Conditions[k](node, v === 'true' ? '' : v));
      return memo;
    }, []);
  }

  static hook(node, params) {
    return Promise.resolve({ node, params });
  }

  static reset(node, params) {
    node.removeAttribute(params.attr);
    node.removeAttribute('data-reset');
    node.removeAttribute(`data-is:${params.attr}`);
  }

  static idle(_, ready) {
    const onload = new Promise(resolve => {
      if (document.readyState !== 'complete') {
        addEventListener('load', () => resolve(), { once: true });
      } else {
        resolve();
      }
    });

    return ready !== false && HAS_REQUEST_IDLE
      ? Promise.all([new Promise(resolve => requestIdleCallback(resolve)), onload])
      : onload;
  }

  static ready() {
    return Conditions.idle(null, false);
  }

  static media(_, query) {
    let q = { matches: true };
    if (query && HAS_MATCH_MEDIA) {
      q = window.matchMedia(query);
    }

    if (!q.matches) {
      return new Promise(resolve => {
        q.addListener(e => e.matches && resolve());
      });
    }
  }

  static visible(el) {
    if (HAS_INTER_OBSERVERS) {
      return new Promise(resolve => {
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            resolve();
          }
        });

        observer.observe(el);
      });
    }
  }

  static savedata(_, expects) {
    return (!HAS_CONNECTION || navigator.connection.saveData === (expects !== 'false')) || sleep();
  }

  static interaction(el, overrides) {
    let events = DEFAULT_EVENTS;
    if (overrides) {
      events = (overrides || '').split(/[,|]/).map(entry => entry.trim());
    }

    return new Promise(resolve => {
      function onEvent(e) {
        for (const name of events) el.removeEventListener(name, onEvent);
        if (DEFAULT_EVENTS.includes(e.type)) resolve();
      }

      for (const name of events) {
        el.addEventListener(name, onEvent, { once: true });
      }
    });
  }
}

export class Components {
  constructor(browser, callback) {
    this.browser = browser;

    this.observer = new MutationObserver(list => {
      for (const mutation of list) {
        const { addedNodes, removedNodes, target } = mutation;

        addedNodes.forEach(node => Conditions.is(node) && this.append(node));
        removedNodes.forEach(node => Conditions.is(node) && this.delete(node));

        if (!this.elements.has(target) && Conditions.is(target)) this.append(target);
      }
    });

    this.components = new Map();
    this.modules = new Map();
    this.imports = [];
    this.on();

    requestAnimationFrame(callback);
  }

  async resolve(file) {
    if (!this.modules.has(file)) {
      return sleep().then(() => this.resolve(file));
    }

    let main = this.modules.get(file);
    while (main.__module || main.default) main = main.__module || main.default;
    return main;
  }

  async import(url) {
    const key = url.replace('.html:', '.html.');
    if (!this.imports[key]) {
      this.imports[key] = Date.now();
      const mod = await import(key);
      this.modules.set(key, { ...mod });
      console.log('IMPORT', key);
    }
    if (!this.modules.has(key)) {
      return sleep().then(() => this.import(url));
    }
    return this.modules.get(key);
  }

  // FIXME: one state to rule them all? istead of fetching individual state per-component
  // we should have a central state that can be refreshed by repeating the request, if any
  // on server... actually, we can sync between using a single SSE channel, right?

  async load(node, events) {
    node.__pending = null;

    if (node.dataset.component) {
      // FIXME: we should handle "sent" flag from here, as we have the initial
      // request for the used module we can tell to skip sending it again...
      // const flags = node.current ? '?k=data' : '';
      const [src] = node.dataset.component.split(':');
      const mod = await this.import(`/_/${node.dataset.component}`);
      const state = this.components.get(node.dataset.component);

      // // this.modules.set(src, mod);
      console.log('COMPONENT', { mod, state, events }, !!node.__update);

      try {
        if (node.__update) {
          // FIXME: state is good, but is not being calculated...
          await node.__update(mod.__module, state);
        } else {
          await this.attach(mod.__module, node, state, events, src);
        }
      } catch (e) {
        console.warn(e.message);
      }
    } else if ('enhance' in node.dataset) {
      requestAnimationFrame(() => this.hooks(node, events));
    }
  }

  on() {
    this.elements = new Set([...document.querySelectorAll('[data-component],[data-enhance],[data-reset]')]);

    requestAnimationFrame(() => this.elements.forEach(node => Conditions.is(node) && this.append(node)));

    this.observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  off() {
    if (this.observer) this.observer.disconnect();
    this.elements.forEach(node => this.delete(node));
  }

  hooks(node, events) {
    if (node.__hooks) {
      node.__hooks.forEach(fn => fn());
    }

    node.__hooks = [];

    return Promise.all(events.map(ev => {
      if (!(ev && ev.node)) return;

      const [uuid, ...parts] = ev.params.source.split('/');
      const key = `${ev.params.name}.${uuid}@${parts.join('/')}`;

      return this.import(`/_/${key}`).then(mod => {
        console.log('HOOK', mod, ev.params);
        // if (mod.__hook) {
        //   const off = mod.__hook(node, mod.__data);

        //   if (Is.func(off)) {
        //     node.__hooks.push(off);
        //   }
        // }
      });
    }));
  }

  reload(source) {
    console.log('HMR?', source);
    this.modules = new Map();
    this.imports = [];

    // FIXME: this causes problem... what should we do?
    // this.elements.forEach(node => {
    //   node.__pending = null;
    //   this.delete(node);
    //   this.refresh(node);
    // });
  }

  async refetch() {
    console.log('REFETCH');
    await import(`/_/${this.browser.request_uuid}`);
    this.reload();
  }

  define(ref, props, scope, slots) {
    this.components.set(ref, { props, scope, slots });
  }

  attach(mod, node, state, events, filepath) {
    if (!(window.Jamrock.Runtime && window.Jamrock.Runtime.mountableComponent)) {
      return sleep().then(() => this.attach(mod, node, state, events, filepath));
    }

    // FIXME: for some reason hydration does not longer works after first-render...
    const component = window.Jamrock.Runtime.mountableComponent(mod, {
      hydrate: !node.__hydrated,
      load: id => {
        const url = new URL(id, `file://${filepath}`).href;
        return this.import(url.replace('file://', '/_/'));
      },
      sync: async vdom => {
        await this.browser.patch(node, vdom);
        requestAnimationFrame(() => this.hooks(node, events));
      },
    }, filepath);

    node.__hydrated = true;
    return component.mount(node, state);
  }

  append(node) {
    if (!this.loaded) {
      this.loaded = true;
      this.browser.runtime().then(() => {
        Object.assign(window.Jamrock.Runtime, {
          onError, useRef, useMemo, useState, useEffect, createContext, wrapComponent, mountableComponent,
        });
      });
    }

    this.elements.add(node);
    this.refresh(node);
  }

  refresh(node) {
    if (node.__pending) return;
    node.__pending = true;

    if (!Conditions.has(node)) {
      Conditions.ready().then(() => this.load(node, []));
    } else {
      Promise.all(Conditions.map(node)).then((...set) => this.load(node, [].concat(...set)));
    }
  }

  delete(node) {
    this.elements.delete(node);

    if (node.__hooks) {
      node.__hooks.forEach(fn => fn());
      node.__hooks = null;
    }

    if (node.__store && node.__store.state) {
      node.__store.state.clear();
      node.__store = null;
    }
  }

  clear() {
    this.elements.forEach(node => this.delete(node));
  }
}
