import { signal, computed, effect, batch, untracked } from 'somedom';

const useMemo = computed;
const ref = <T>(current: T): { current: T } => ({ current });

import { mountableComponent } from './render.ts';
import { Is, sleep } from '../utils/client.ts';
import { flatten } from '../utils/shared.ts';

const HAS_INTER_OBSERVERS = 'IntersectionObserver' in window;
const HAS_REQUEST_IDLE = 'requestIdleCallback' in window;
const HAS_MATCH_MEDIA = 'matchMedia' in window;
const HAS_CONNECTION = 'connection' in navigator;
const DEFAULT_EVENTS = ['click', 'focusin', 'touchstart'];
const CONDITIONS_MAP = ['idle', 'visible', 'media', 'savedata', 'interaction'];

export class Conditions {
  static is(node: any): boolean {
    return (node.dataset && (
      'component' in node.dataset
      || 'enhance' in node.dataset
      || 'reset' in node.dataset
      || 'use' in node.dataset
    )) || Is.func(node.__destroy);
  }

  static has(node: any): boolean | undefined {
    // eslint-disable-next-line guard-for-in
    for (const key in node.dataset) {
      if (key.indexOf('use:') === 0 || key.indexOf('is:') === 0) return true;
      if (key.indexOf('on:') === 0 && CONDITIONS_MAP.includes(key.substr(3))) return true;
    }
  }

  static get(node: any): Array<[string, any]> {
    const hooks: Array<[string, any]> = [];

    Object.keys(node.dataset).forEach((key: string) => {
      if (key.indexOf('is:') === 0) hooks.push(['reset', { attr: key.substr(3) }]);
      if (key.indexOf('use:') === 0) hooks.push(['hook', { name: key.substr(4), source: node.dataset[key] }]);
      if (key.indexOf('on:') === 0 && CONDITIONS_MAP.includes(key.substr(3))) hooks.push([key.substr(3), node.dataset[key]]);
    });
    return hooks;
  }

  static map(node: any): any[] {
    return Conditions.get(node).reduce((memo: any[], [k, v]) => {
      memo.push((Conditions as any)[k](node, v === 'true' ? '' : v));
      return memo;
    }, []);
  }

  static hook(node: any, params: any): Promise<{ node: any; params: any }> {
    return Promise.resolve({ node, params });
  }

  static reset(node: any, params: any): void {
    node.removeAttribute(params.attr);
    node.removeAttribute('data-reset');
    node.removeAttribute(`data-is:${params.attr}`);
  }

  static idle(_: any, ready?: any): Promise<any> {
    const onload: Promise<any> = new Promise(resolve => {
      if (document.readyState !== 'complete') {
        addEventListener('load', () => resolve(undefined), { once: true });
      } else {
        resolve(undefined);
      }
    });

    return ready !== false && HAS_REQUEST_IDLE
      ? Promise.all([new Promise(resolve => (requestIdleCallback as any)(resolve)), onload])
      : onload;
  }

  static ready(): Promise<any> {
    return Conditions.idle(null, false);
  }

  static media(_: any, query: string): Promise<any> | undefined {
    let q: any = { matches: true };
    if (query && HAS_MATCH_MEDIA) {
      q = window.matchMedia(query);
    }

    if (!q.matches) {
      return new Promise(resolve => {
        q.addListener((e: any) => e.matches && resolve(undefined));
      });
    }
  }

  static visible(el: Element): Promise<void> | undefined {
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

  static savedata(_: any, expects: string): boolean | Promise<void> {
    return (!(HAS_CONNECTION as any) || (navigator as any).connection.saveData === (expects !== 'false')) || sleep(undefined as any);
  }

  static interaction(el: Element, overrides: string): Promise<any> {
    let events = DEFAULT_EVENTS;
    if (overrides) {
      events = (overrides || '').split(/[,|]/).map(entry => entry.trim());
    }

    return new Promise(resolve => {
      function next(event: any, cb: any): void {
        for (const name of events) el.removeEventListener(name, cb);
        resolve(event);
      }

      let t: ReturnType<typeof setTimeout>;
      function skip(e: any, cb: any): any {
        const ev = { x: e.x, y: e.y, tag: e.target.tagName, type: e.type };

        if (e.type === 'click') return next(ev, cb);

        clearTimeout(t);
        t = setTimeout(() => next(ev, cb), 150);
      }

      function onEvent(e: Event): void {
        if (events.includes(e.type)) skip(e, onEvent);
      }

      for (const name of events) {
        el.addEventListener(name, onEvent, { once: true });
      }
    });
  }
}

export class Components {
  declare headless: boolean;
  declare browser: any;
  declare prefix: string;
  declare calls: Record<string, string[]>;
  declare scripts: Record<string, any>;
  declare defaults: Record<string, any>;
  declare observer: MutationObserver;
  declare loaded: any;
  declare modules: Map<string, any>;
  declare imports: any[];
  declare elements: Set<any>;

  constructor(browser: any, prefix: string, { __defaults, __scripts, __calls }: { __defaults?: any; __scripts?: any; __calls?: any }) {
    this.headless = browser.headless;
    this.browser = browser;
    this.prefix = prefix;
    this.calls = __calls || {};
    this.scripts = __scripts || {};
    this.defaults = __defaults || {};

    this.observer = new MutationObserver(list => {
      for (const mutation of list) {
        const { addedNodes, removedNodes, target } = mutation;

        addedNodes.forEach((node: any) => Conditions.is(node) && this.append(node));
        removedNodes.forEach((node: any) => Conditions.is(node) && this.delete(node));

        if (!this.elements.has(target) && Conditions.is(target)) this.append(target as any);
      }
    });

    this.loaded = new Map();
    this.modules = new Map();
    this.imports = [];
    this.on();
  }

  rebase(url: string, reload?: boolean): string {
    const q = reload || this.modules.has(url) ? `?_=${Date.now()}` : '';
    const path = `/${this.prefix}/${url}${q}`;
    return path;
  }

  async resolve(key: string): Promise<any> {
    await this.import(key);
    return this.loaded.get(key);
  }

  async import(url: string, reload?: boolean): Promise<any> {
    console.log('[ESM]', url);

    const path = this.rebase(url, reload);

    if (!(this.imports as any)[path]) {
      const src = path.replace(/\.(?:md|html)(?:\/\d+)?/, '.bundled.mjs');

      (this.imports as any)[path] = Date.now();
      let mod = await import(src);
      mod = mod.default || mod;
      this.modules.set(url, mod);
      if (url.includes('.md') || url.includes('.html')) {
        const old = this.loaded.get(url);
        this.defaults[url] = { ...mod.__data, ...this.defaults[url] };
        this.loaded.set(url, { ...old, ...mod, __data: this.defaults[url] });
      }
    }
    if (!this.modules.has(url)) {
      return sleep(undefined as any).then(() => this.import(url));
    }
    return this.modules.get(url);
  }

  async load(node: any, events: any[]): Promise<void> {
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
      } catch (e: any) {
        console.warn(e.message);
      }
    } else if ('enhance' in node.dataset) {
      requestAnimationFrame(() => this.hooks(node, events));
    } else if ('use' in node.dataset) {
      this.ref(node, node.dataset.use);
    }
  }

  on(): void {
    this.elements = new Set([...document.querySelectorAll('[data-component],[data-enhance],[data-reset],[data-use]')]);

    requestAnimationFrame(() => this.elements.forEach(node => Conditions.is(node) && this.append(node)));
    requestAnimationFrame(() => this.browser.scripts(this.scripts));

    this.observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  off(): void {
    if (this.observer) this.observer.disconnect();
    this.elements.forEach(node => this.delete(node));
  }

  set(defaults: any, calls: any, scripts: any, fragments: any): void {
    console.log('[FRAGMENTS]', fragments);
    if (calls) Object.assign(this.calls, calls);
    if (scripts) Object.assign(this.scripts, scripts);
    if (defaults) Object.assign(this.defaults, defaults);
  }

  ref(node: any, script: string): void {
    this.import(script).then((hook: any) => {
      if (hook.__execute) return hook.__execute(node);
    });
  }

  hooks(node: any, events: any[]): Promise<any> {
    if (node.__hooks) {
      node.__hooks.forEach((fn: () => void) => fn());
    }

    node.__hooks = [];

    return Promise.all(events.reduce((memo: any[], ev: any) => {
      if (ev?.type === 'click') {
        const el = document.elementFromPoint(ev.x, ev.y);
        if (el!.tagName === ev.tag) (el as HTMLElement).click();
      }

      if (ev?.node) {
        const key = ev.params.source;
        const src = key.replace(/\.(?:md|html)(?:\/\d+)?$/, '.hooks.mjs');

        memo.push(this.import(src)
          .then((mod: any) => {
            // console.log('[HOOK]', ev.node, ev.params);
            const off = mod[ev.params.name](node);
            if (Is.func(off)) node.__hooks.push(off);
          }));
      }

      return memo;
    }, []));
  }

  reload(source: string): void {
    console.log('[HMR]', source);
    this.modules = new Map();
    this.imports = [];
  }

  refetch(): void {
    console.log('[REFETCH]');
    this.reload(undefined as any);
  }

  attach(mod: any, node: any, state: any, filepath: string): Promise<any> {
    if (!((window as any).Jamrock.Runtime && (window as any).Jamrock.Runtime.mountableComponent)) {
      return sleep(undefined as any).then(() => this.attach(mod, node, state, filepath));
    }

    const component = (window as any).Jamrock.Runtime.mountableComponent(mod, {
      sync: (vdom: any) => this.browser.patch(node, vdom),
    }, filepath);

    return component.mount(node, state);
  }

  append(node: any): void {
    if (!this.loaded) {
      this.loaded = true;
      this.browser.runtime().then(() => {
        Object.assign((window as any).Jamrock.Runtime, {
          ref, useMemo, mountableComponent,
          signal, computed, effect, batch, untracked,
        });
      });
    }

    this.elements.add(node);
    this.refresh(node);
  }

  refresh(node: any): void {
    if (node.__pending) return;
    node.__pending = true;

    if (!Conditions.has(node)) {
      Conditions.ready().then(() => this.load(node, []));
    } else {
      Promise.all(Conditions.map(node)).then((...set: any[]) => this.load(node, flatten(set) as any[]));
    }
  }

  delete(node: any): void {
    node.dispatchEvent(new CustomEvent('teardown'));

    this.elements.delete(node);

    if (node.__hooks) {
      node.__hooks.forEach((fn: () => void) => fn());
      node.__hooks = null;
    }

    if (node.__store) {
      node.__store.clear();
      node.__store = null;
    }
  }

  clear(): void {
    this.elements.forEach(node => this.delete(node));
  }
}
