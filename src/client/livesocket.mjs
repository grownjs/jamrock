import { decode, updatePage, spaNavigate } from '../utils/client.mjs';

const protocol = location.protocol === 'http:' ? 'ws' : 'wss';

export class LiveSocket {
  constructor(browser) {
    Object.defineProperty(this, 'uuid', {
      get: () => browser.request_uuid,
    });

    this.ready = false;
    this.browser = browser;
    this.headless = browser.headless;
    this.document = document.documentElement.dataset.location;
    this.location = location.pathname.split(this.uuid)[1] || location.pathname;

    console.debug('connect', this.uuid, this.location);

    let interval = 100;
    function timeout(msg) {
      console.debug('RETRY', msg, interval);
      const ms = interval;
      interval *= 2;
      return ms;
    }

    function throttle(callback, time) {
      if (callback.t) return;
      callback.t = true;
      setTimeout(() => {
        callback();
        callback.t = false;
      }, time);
    }

    let ws;
    this.send = (...args) => ws.try(...args);
    this.close = () => {
      this.ready = false;
      if (ws) {
        if (ws.readyState === ws.OPEN) ws.send(`rpc:disconnect ${this.uuid}`);
        ws.close();
        ws = null;
      }
    };

    function defer() {
      let resolve;
      let reject;

      const deferred = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });

      deferred.resolve = resolve;
      deferred.reject = reject;
      return deferred;
    }

    this.call = (msg, next) => {
      const id = `#${Date.now().toString(13)}`;

      this.send(msg, async () => {
        if (next) next();

        const timer = setTimeout(() => {
          if (this[id]) {
            this[id].reject();
            delete this[id];
          }
        }, 1260);

        try {
          this[id] = await defer();
        } catch (_e) {
          this.warn(_e, 'RPC Failure');
        } finally {
          delete this[id];
          clearTimeout(timer);
        }
      });
    };

    // FIXME: try sending blob to ws... a big difference here
    // is that we could omit some fields if they were already sent...
    // so, we can persist a local state on the running server attached
    // to the websocket...
    this.deferred = Promise.resolve();
    this.upload = (key, file) => new Promise(ok => {
      setTimeout(() => ok(console.log('UPLOAD', key, file)), 300);
    });
    this.unpack = payload => {
      const body = new FormData();
      const tasks = [];

      if (payload instanceof FormData) {
        for (const [key, value] of payload.entries()) {
          if (value instanceof File) {
            tasks.push(this.upload(key, value));
          } else {
            body.append(key, value);
          }
        }
      }

      this.deferred = this.deferred.then(() => Promise.all(tasks));
      return new URLSearchParams(body);
    };

    this.submit = (el, url, body, method) => {
      let data = this.unpack(body);

      url = url.replace(location.origin, '');
      url = method === 'GET' && data ? `${url.split('?')[0]}?${data}` : url;
      data = method === 'GET' && data ? '' : `\t${data}`;

      this.deferred = this.deferred.then(() => {
        this.call(`rpc:request ${this.uuid} ${method} ${url}${data}`, () => {
          if (el) el.classList.remove('loading');
          updatePage('', url);
        });
      });
    };

    // FIXME: rethink since @live seems to be transparent
    this.trigger = (e, kind, source, trigger, payload, callback) => {
      e.preventDefault();

      const call = trigger.dataset['ws:call'];
      const key = trigger.dataset['ws:yield'];
      const data = this.unpack(payload);

      this.call(`rpc:trigger ${this.uuid} ${source} ${kind} ${call}:${key}\t${data}`, () => {
        if (callback) callback(trigger, 'rpc');
      });
    };

    this.patchSVG = async src => {
      for (const node of document.querySelectorAll(`[data-location="${src}"]`)) {
        const result = await fetch(`${this.browser.prefix}${src}`).then(resp => resp.text());
        const target = document.createElement('div');
        const source = node.tagName === 'use'
          ? node.parentNode
          : node;

        const width = source.getAttribute('width');
        const height = source.getAttribute('height');
        target.innerHTML = result;

        const svg = target.childNodes[0];
        svg.setAttribute('data-location', src);
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        if (node.tagName === 'use') {
          document.querySelector(node.getAttribute('xlink:href')).remove();
          node.parentNode.replaceWith(svg);
        } else {
          node.replaceWith(svg);
        }
      }
    };

    this.patchCSS = src => {
      const node = document.querySelector(`link[href^="${this.browser.prefix}/${src}"]`);
      const href = node.getAttribute('href').split('?')[0];
      node.href = `${href}?_${Date.now()}`;
    };

    this.patch = sources => {
      for (const src of sources) {
        if (src.includes('.svg')) this.patchSVG(src);
        if (src.includes('.css')) this.patchCSS(src);
      }
    };

    // window.onbeforeunload = () => this.close() || null;

    function connect(doc, uuid, ready) {
      return new Promise(ok => {
        ws = new WebSocket(`${protocol}://${location.host}`);

        ws.addEventListener('open', () => {
          ws.send(`rpc:connect ${uuid} ${doc}`);
          interval = 100;
          ready(doc, uuid, ws, ok(ws));
        });

        ws.addEventListener('error', () => {
          setTimeout(() => connect(doc, uuid, ready).then(ok), timeout('connect'));
        });
      });
    }

    function open(doc, uuid, socket) {
      socket.try = (msg, cb) => {
        if (socket.readyState !== socket.OPEN) {
          setTimeout(() => connect(doc, uuid, open).then(() => socket.try(msg, cb)), timeout('open'));
          return;
        }
        socket.send(msg);
        if (cb) cb(socket);
      };
    }

    let eventSource;
    this.start = () => {
      eventSource?.close();
      eventSource = new EventSource(`/${this.browser.prefix}?_=${this.uuid}`);
      eventSource.onopen = () => {
        this.ready = false;
        ws?.close();
        ws = null;
        this.sync();
      };
      eventSource.onerror = () => {
        if (ws && this.ready) {
          this.ready = false;
          ws.close();
          ws = null;
        }

        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('[RECONNECT SSE]');
        }
      };
      eventSource.onmessage = event => {
        console.log('@@', event.data);
      };
    };

    const queue = [];

    let wait;
    let ok;
    const run = async () => {
      if (this.browser.paused) {
        clearTimeout(wait);
        wait = setTimeout(run, 120);
        return;
      }

      if (!ok) {
        ok = true;
        this.browser.paused = true;
        await this.browser.runtime();
        this.browser.paused = false;
      }

      requestAnimationFrame(() => queue.length > 0 && Promise.resolve(queue.shift()(window.Jamrock)).then(run));
    };

    const refresh = e => {
      try {
        if (e?.isTrusted) {
          // window.frames.top.Jamrock.Components.reload(e.data);
          window.frames.top.Jamrock.Browser.reload(null, true);
        } else {
          // window.Jamrock.Components.reload(e.data);
          window.Jamrock.Browser.reload(null, true);
        }
      } catch (error) {
        console.error('Error reloading:', error);
        window.Jamrock.Browser.reload(null, true);
      }
    };

    this.next = _uuid => {
      if (ws && ws.readyState === ws.OPEN) ws.send(`rpc:reconnect ${this.browser.request_uuid = _uuid}`);
    };

    // FIXME: we could add a layer after some time of inactivity, once we detect
    // we not longer have ws connectivity... then, once clicked we reconnect and so!
    this.sync = () => !this.headless && (!ws || ws.readyState !== ws.OPEN) && connect(this.document, this.uuid, open).then(socket => {
      this.ready = true;

      let t;
      socket.addEventListener('message', e => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (socket.readyState === socket.OPEN) socket.send('alive');
        }, Math.floor(Math.random() * (7500 - 6000)) + 6000);

        if (e.data === 'refresh') {
          refresh(e);
        }

        if (e.data.indexOf('reload ') === 0) {
          const [, ...sources] = e.data.split(/\s+/).filter(Boolean);

          if (!sources.length || sources.includes(this.document)) {
            refresh(e);
          } else {
            this.patch(sources);
          }
        } else if (e.data.indexOf('welcome ') === 0) {
          console.debug(e.data, this.location);
        } else if (e.data.indexOf('@debug ') === 0) {
          const offset = e.data.indexOf('{');
          const [, kind, args] = e.data.substr(0, offset).split(' ');

          console[kind](...args);
        } else if (e.data.indexOf('rpc:') === 0) {
          const payload = e.data.substr(4);
          const body = payload.includes('\t')
            ? payload.substr(0, payload.indexOf('\t'))
            : payload;

          const chunk = payload.substr(body.length + 1);

          let data = {};
          if (!(chunk === 'null' || chunk === 'undefined')) {
            data = JSON.parse(decode(chunk));
          }

          const [task, ...args] = body.split(/\s+/);

          if (args[0] !== this.uuid) return;

          if (task === 'response') {
            console.log('[RESPONSE]', data);
            this.browser.sync(data, spaNavigate);
            return;
          }

          if (task === 'failure') {
            this.browser.warn(data, 'WebSocket Failure');
            return;
          }

          if (task !== 'update') {
            console.debug('RPC', task, args);
            return;
          }

          queue.push(({ Fragment }) => {
            try {
              let direction = 0;
              if (args[2] === 'append') direction = 1;
              if (args[2] === 'prepend') direction = -1;
              if (args[0] !== this.uuid) return;

              return Fragment.patch(args[1], data, direction);
            } catch (_e) {
              return this.browser.warn(_e, `Failed to ${task} fragment '${args[1]}'`);
            }
          });
          throttle(run, 60);
        }
      });
    });
  }
}
