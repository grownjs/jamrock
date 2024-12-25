import { onError, useRef, useMemo, useState, useEffect, createContext } from 'nohooks';

import { wrapComponent, mountableComponent } from './render.mjs';
import { Is, sleep } from '../utils/client.mjs';
import { flatten } from '../utils/shared.mjs';

const PATH_LOADER_PREFIX = '@';

const HAS_INTER_OBSERVERS = 'IntersectionObserver' in window;
const HAS_REQUEST_IDLE = 'requestIdleCallback' in window;
const HAS_MATCH_MEDIA = 'matchMedia' in window;
const HAS_CONNECTION = 'connection' in navigator;
const DEFAULT_EVENTS = ['click', 'focusin', 'touchstart'];
const CONDITIONS_MAP = ['idle', 'visible', 'media', 'savedata', 'interaction'];

export class Conditions {
  static is(node) {
    return (node.dataset && (
      'component' in node.dataset
      || 'enhance' in node.dataset
      || 'reset' in node.dataset
      || 'use' in node.dataset
    )) || Is.func(node.__destroy);
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
      function next(event, cb) {
        for (const name of events) el.removeEventListener(name, cb);
        resolve(event);
      }

      let t;
      function skip(e, cb) {
        const ev = { x: e.x, y: e.y, tag: e.target.tagName, type: e.type };

        if (e.type === 'click') return next(ev, cb);

        clearTimeout(t);
        t = setTimeout(() => next(ev, cb), 150);
      }

      function onEvent(e) {
        if (events.includes(e.type)) skip(e, onEvent);
      }

      for (const name of events) {
        el.addEventListener(name, onEvent, { once: true });
      }
    });
  }
}

export class Components {
  constructor(browser, { __defaults, __scripts }) {
    this.browser = browser;
    this.scripts = __scripts || {};
    this.defaults = __defaults || {};

    this.observer = new MutationObserver(list => {
      for (const mutation of list) {
        const { addedNodes, removedNodes, target } = mutation;

        addedNodes.forEach(node => Conditions.is(node) && this.append(node));
        removedNodes.forEach(node => Conditions.is(node) && this.delete(node));

        if (!this.elements.has(target) && Conditions.is(target)) this.append(target);
      }
    });

    this.elements = new Map();
    this.modules = new Map();
    this.imports = [];
    this.on();
  }

  rebase(url) {
    const q = this.modules.has(url) ? `?_=${Date.now()}` : '';
    const path = `/${PATH_LOADER_PREFIX}/${this.browser.request_uuid}/${url}${q}`;
    return path;
  }

  async resolve(key) {
    await this.import(key);
    return this.elements.get(key);
  }

  async import(url) {
    console.log('[ESM]', url);

    const path = this.rebase(url);

    if (!this.imports[path]) {
      this.imports[path] = Date.now();
      let mod = await import(path);
      mod = mod.default || mod;
      this.modules.set(url, mod);
      if (url.includes('.html')) {
        const old = this.elements.get(url);
        this.defaults[url] = { ...mod.__data, ...this.defaults[url] };
        this.elements.set(url, { ...old, ...mod, __data: this.defaults[url] });
      }
    }
    if (!this.modules.has(url)) {
      return sleep().then(() => this.import(url));
    }
    return this.modules.get(url);
  }

  async load(node, events) {
    node.__pending = null;

    if (node.dataset.component) {
      const [key] = node.dataset.component.split(':');
      const src = key.replace(/\/\d+$/, '');
      const mod = await this.resolve(key);

      try {
        if (node.__update) {
          await node.__update(mod, mod.__data);
        } else {
          await this.attach(mod, node, mod.__data, src);
        }
        requestAnimationFrame(() => this.hooks(node, events));
      } catch (e) {
        console.warn(e.message);
      }
    } else if ('enhance' in node.dataset) {
      requestAnimationFrame(() => this.hooks(node, events));
    } else if ('use' in node.dataset) {
      this.ref(node, node.dataset.use);
    }
  }

  on() {
    this.elements = new Set([...document.querySelectorAll('[data-component],[data-enhance],[data-reset],[data-use]')]);

    requestAnimationFrame(() => this.elements.forEach(node => Conditions.is(node) && this.append(node)));
    requestAnimationFrame(() => this.browser.scripts(this.scripts));

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

  set(defaults, scripts, fragments) {
    console.log('[FRAGMENTS]', fragments);
    if (scripts) Object.assign(this.scripts, scripts);
    if (defaults) Object.assign(this.defaults, defaults);
  }

  ref(node, reference) {
    console.log('[REF]', node, reference);
    this.import(reference).then(hook => {
      if (hook.__execute) return hook.__execute(node);
    });
  }

  hooks(node, events) {
    if (node.__hooks) {
      node.__hooks.forEach(fn => fn());
    }

    node.__hooks = [];

    return Promise.all(events.reduce((memo, ev) => {
      if (ev?.type === 'click') {
        const el = document.elementFromPoint(ev.x, ev.y);
        if (el.tagName === ev.tag) el.click();
      }

      if (ev?.node) {
        console.log('[HOOK]', ev.node, ev.params, this);
        // const [uuid, ...parts] = ev.params.source.split('/');
        // const key = `${ev.params.name}.${uuid}@${parts.join('/')}`;

        // memo.push(this.import(key).then(mod => {
        // if (mod.__hook) {
        //   const off = mod.__hook(node, mod.__data);

        //   if (Is.func(off)) {
        //     node.__hooks.push(off);
        //   }
        // }
        // }));
      }

      return memo;
    }, []));
  }

  reload(source) {
    console.log('[HMR]', source);
    this.modules = new Map();
    this.imports = [];
  }

  refetch() {
    console.log('[REFETCH]');
    this.reload();
  }

  attach(mod, node, state, filepath) {
    if (!(window.Jamrock.Runtime && window.Jamrock.Runtime.mountableComponent)) {
      return sleep().then(() => this.attach(mod, node, state, filepath));
    }

    const component = window.Jamrock.Runtime.mountableComponent(mod, {
      sync: vdom => this.browser.patch(node, vdom),
    }, filepath);

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
      Promise.all(Conditions.map(node)).then((...set) => this.load(node, flatten(set)));
    }
  }

  delete(node) {
    node.dispatchEvent(new CustomEvent('teardown'));

    this.elements.delete(node);

    if (node.__hooks) {
      node.__hooks.forEach(fn => fn());
      node.__hooks = null;
    }

    if (node.__store) {
      node.__store.clear();
      node.__store = null;
    }
  }

  clear() {
    this.elements.forEach(node => this.delete(node));
  }
}
