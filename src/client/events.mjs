import { findNodes } from '../utils/client.mjs';

export class EventHub {
  constructor(sockets) {
    this.browser = sockets.browser;
    this.sockets = sockets;
    this.loaded = [];
  }

  start() {
    this.handle('submit', this.onSubmit());
    this.handle('popstate', () => this.browser.reload());

    ['click', 'input', 'change'].forEach(e => this.handle(e));
  }

  handle(e, cb) {
    const listeners = this.listeners || (this.listeners = {});
    const fn = cb || listeners[e] || (listeners[e] = this.onHandle(e));

    removeEventListener(e, fn, false);
    addEventListener(e, fn, false);
  }

  require(i, el, mod) {
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
  confirm(el, cb) {
    const _confirm = findNodes('confirm', el) || null;
    if (window.debug) console.log(this);
    if (_confirm && !confirm(_confirm.dataset.confirm)) return;
    return cb();
  }

  onSubmit() {
    return e => {
      if (
        'confirm' in e.target.dataset
        || 'async' in e.target.dataset
        || 'trigger' in e.target.dataset
      ) {
        e.preventDefault();
        this.require(0, e.target, import('./submit.mjs')).then(({ handleSubmit }) => handleSubmit.call(this, e));
      }
    };
  }

  onHandle(kind) {
    return e => {
      if (e.metaKey && kind === 'click') {
        let ref = findNodes('location', e.target);
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
        return this.require(1, e.target, import('./handler.mjs'))
          .then(({ handleEvent }) => handleEvent.call(this, e, kind));
      });
    };
  }

  async loadURL(el, ...args) {
    return this.confirm(el, async () => {
      const fragment = findNodes('fragment', el) || null;
      const target = findNodes('target', el) || null;
      const wait = findNodes('wait', el) || null;
      const live = findNodes('live', el) || null;

      if (live) {
        if (fragment) args[4] = { ...args[4], 'request-ref': fragment.dataset.fragment };
        return this.sockets.submit(el, ...args);
      }

      this.browser.pause();
      try {
        const { loadPage } = await import('./request.mjs');

        return loadPage.call(this, { el, wait, target, fragment }, ...args);
      } finally {
        this.browser.resume();
      }
    });
  }
}
