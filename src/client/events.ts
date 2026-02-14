import { findNodes } from '../utils/client.ts';

export class EventHub {
  declare browser: any;
  declare sockets: any;
  declare loaded: number[];
  declare listeners: Record<string, (e: any) => any>;

  constructor(sockets: any) {
    this.browser = sockets.browser;
    this.sockets = sockets;
    this.loaded = [];
  }

  start(): void {
    this.handle('submit', this.onSubmit());
    this.handle('popstate', () => this.browser.reload());

    ['click', 'input', 'change'].forEach(e => this.handle(e));
  }

  handle(e: string, cb?: (e: any) => any): void {
    const listeners = this.listeners || (this.listeners = {} as Record<string, (e: any) => any>);
    const fn = cb || listeners[e] || (listeners[e] = this.onHandle(e));

    removeEventListener(e, fn, false);
    addEventListener(e, fn, false);
  }

  require(i: number, el: any, mod: Promise<any>): Promise<any> {
    if (!this.loaded.includes(i)) {
      if (el && 'source' in el.dataset) el.classList.add('loading');
    }
    return mod.then(result => {
      if (!this.loaded.includes(i)) {
        this.loaded.push(i);
      }
      return result;
    });
  }

  // this could be async? also, for both submit/events
  confirm(el: any, cb: () => any): any {
    const _confirm = findNodes('confirm', el) || null;
    if ((window as any).debug) console.log(this);
    if (_confirm && !confirm((_confirm as HTMLElement).dataset.confirm!)) return;
    return cb();
  }

  onSubmit(): (e: any) => void {
    return (e: any) => {
      if (
        'confirm' in e.target.dataset
        || 'async' in e.target.dataset
        || 'trigger' in e.target.dataset
      ) {
        e.preventDefault();
        this.require(0, e.target, import('./submit.ts')).then(({ handleSubmit }) => handleSubmit.call(this, e));
      }
    };
  }

  onHandle(kind: string): (e: any) => any {
    return (e: any) => {
      if (e.metaKey && (e.shiftKey || e.altKey) && kind === 'click') {
        let ref: any = findNodes('location', e.target, e.altKey ? 1 : 0);
        if (e.target === document.documentElement || e.target === document.body) {
          ref = document.documentElement;
        }

        if (ref && ref.dataset && 'location' in ref.dataset) {
          if (this.sockets.ready) {
            this.sockets.send(`rpc:open ${ref.dataset.location}`);
          } else {
            fetch(`/__open?@=${encodeURIComponent(ref.dataset.location)}`);
          }
        }
        e.preventDefault();
        return;
      }

      if (e.target.closest('[data-component]')) return;

      if (kind === 'input' && ['FORM', 'INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        const el = e.target.form || e.target;

        if (el.checkValidity()) {
          el.classList.remove('invalid');
        } else {
          el.classList.add('invalid');
          return;
        }
      }

      if (kind === 'click' && (['BUTTON', 'INPUT'].includes(e.target.tagName) && e.target.type === 'submit') && e.target.form) return;

      if (['INPUT', 'SELECT'].includes(e.target.tagName) && kind === 'click') return;
      if (!['A', 'INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
      if (e.target.tagName === 'SELECT' && kind === 'input') return;
      if (e.target.tagName === 'INPUT' && kind === 'change') return;

      if (e.target.tagName === 'A') {
        if ((e.metaKey || e.ctrlKey || e.button !== 0)
          || e.target.protocol !== location.protocol
          || e.target.host !== location.host
          || e.target.hasAttribute('target')
        ) return;
        e.preventDefault();
      }

      return this.confirm(e.target, () => {
        return this.require(1, e.target, import('./handler.ts'))
          .then(({ handleEvent }) => handleEvent.call(this, e, kind));
      });
    };
  }

  async loadURL(el: any, ...args: any[]): Promise<any> {
    return this.confirm(el, async () => {
      const fragment = findNodes('fragment', el) || null;
      const target = findNodes('target', el) || null;
      const wait = findNodes('wait', el) || null;
      const live = findNodes('live', el) || null;

      if (live) {
        if (fragment) (args as any)[4] = { ...(args as any)[4], 'request-ref': (fragment as HTMLElement).dataset.fragment };
        return this.sockets.submit(el, ...args);
      }

      this.browser.pause();
      try {
        const { loadPage } = await import('./request.ts');

        return loadPage.call(this, { el, wait, target, fragment }, ...args);
      } finally {
        this.browser.resume();
      }
    });
  }
}
