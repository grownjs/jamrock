import { decode, updatePage, spaNavigate } from '../utils/client.ts';

function createSSESocket(uuid: string, prefix: string, onMessage: (_msg: string) => void): any {
  let eventSource: EventSource;
  let readyState = 0;

  const send = async (msg: string) => {
    try {
      await fetch(`/${prefix}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'request-uuid': uuid,
        },
        body: `cmd=${encodeURIComponent(msg)}`,
      });
    } catch (e) {
      console.error('SSE send error:', e);
    }
  };

  const connect = () => {
    eventSource?.close();
    readyState = 0;
    eventSource = new EventSource(`/${prefix}?_=${uuid}`);

    eventSource.onopen = () => {
      readyState = 1;
      send(`rpc:connect ${uuid} ${location.pathname}`);
    };

    eventSource.onmessage = (event: MessageEvent) => {
      onMessage(event.data);
    };

    eventSource.onerror = () => {
      readyState = eventSource.readyState === EventSource.CLOSED ? 3 : 2;
      if (eventSource.readyState === EventSource.CLOSED) {
        setTimeout(connect, 1000);
      }
    };
  };

  connect();

  return {
    readyState,
    OPEN: 1,
    CLOSED: 3,
    send,
    close: () => {
      send(`rpc:disconnect ${uuid}`);
      eventSource?.close();
      readyState = 3;
    },
  };
}

export class LiveSocket {
  declare uuid: string;
  declare ready: boolean;
  declare browser: any;
  declare headless: boolean;
  declare document: string;
  declare location: string;
  // eslint-disable-next-line no-unused-vars
  declare send: (...args: any[]) => void;
  declare close: () => void;
  // eslint-disable-next-line no-unused-vars
  declare call: (msg: string, next?: () => void) => void;
  declare deferred: Promise<any>;
  // eslint-disable-next-line no-unused-vars
  declare upload: (key: string, file: File) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  declare unpack: (payload: any) => URLSearchParams;
  // eslint-disable-next-line no-unused-vars
  declare submit: (el: any, url: string, body: any, method: string) => void;
  // eslint-disable-next-line no-unused-vars
  declare trigger: (e: any, kind: string, source: string | null, trigger: any, payload: any, callback?: any) => void;
  // eslint-disable-next-line no-unused-vars
  declare patchSVG: (src: string) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  declare patchCSS: (src: string) => void;
  // eslint-disable-next-line no-unused-vars
  declare patch: (sources: string[]) => boolean;
  // eslint-disable-next-line no-unused-vars
  declare next: (uuid: string) => void;
  declare sync: () => void;
  declare start: () => void;
  // eslint-disable-next-line no-unused-vars
  declare warn: (e: any, msg: string) => void;

  constructor(browser: any) {
    Object.defineProperty(this, 'uuid', {
      get: () => browser.request_uuid,
    });

    this.ready = false;
    this.browser = browser;
    this.headless = browser.headless;
    this.document = document.documentElement.dataset.location!;
    this.location = location.pathname.split(this.uuid)[1] || location.pathname;

    console.debug('connect', this.uuid, this.location);

    let interval = 100;
    function timeout(msg: string): number {
      console.debug('RETRY', msg, interval);
      const ms = interval;
      interval *= 2;
      return ms;
    }

    function throttle(callback: any, time: number): void {
      if (callback.t) return;
      callback.t = true;
      setTimeout(() => {
        callback();
        callback.t = false;
      }, time);
    }

    let ws: any;
    let connecting: boolean = false;
    this.send = (...args: any[]) => ws.try(...args);
    this.close = () => {
      this.ready = false;
      if (ws) {
        if (ws.readyState === ws.OPEN) ws.send(`rpc:disconnect ${this.uuid}`);
        ws.close();
        ws = null;
      }
    };

    function defer(): any {
      let resolve: any;
      let reject: any;

      const deferred: any = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });

      deferred.resolve = resolve;
      deferred.reject = reject;
      return deferred;
    }

    this.call = (msg: string, next?: () => void) => {
      const id = `#${Date.now().toString(13)}`;

      this.send(msg, async () => {
        if (next) next();

        const timer = setTimeout(() => {
          if ((this as any)[id]) {
            (this as any)[id].reject();
            delete (this as any)[id];
          }
        }, 1260);

        try {
          (this as any)[id] = await defer();
        } catch (_e) {
          this.warn(_e, 'RPC Failure');
        } finally {
          delete (this as any)[id];
          clearTimeout(timer);
        }
      });
    };

    this.deferred = Promise.resolve();
    this.upload = (key: string, file: File) => new Promise(ok => {
      setTimeout(() => ok(console.log('UPLOAD', key, file) as any), 300);
    });
    this.unpack = (payload: any) => {
      const body = new FormData();
      const tasks: Promise<any>[] = [];

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
      return new URLSearchParams(body as any);
    };

    this.submit = (el: any, url: string, body: any, method: string) => {
      let data: any = this.unpack(body);

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
    this.trigger = (e: any, kind: string, source: string | null, trigger: any, payload: any, callback?: any) => {
      e.preventDefault();

      const call = trigger.dataset['ws:call'];
      const key = trigger.dataset['ws:yield'];
      const data = this.unpack(payload);

      this.call(`rpc:trigger ${this.uuid} ${source} ${kind} ${call}:${key}\t${data}`, () => {
        if (callback) callback(trigger, 'rpc');
      });
    };

    this.patchSVG = async (src: string) => {
      for (const node of document.querySelectorAll(`[data-location="${src}"]`)) {
        const result = await fetch(`${this.browser.prefix}${src}`).then(resp => resp.text());
        const target = document.createElement('div');
        const source = node.tagName === 'use'
          ? node.parentNode as Element
          : node;

        const width = source.getAttribute('width');
        const height = source.getAttribute('height');
        target.innerHTML = result;

        const svg = target.childNodes[0] as Element;
        svg.setAttribute('data-location', src);
        svg.setAttribute('width', width!);
        svg.setAttribute('height', height!);

        if (node.tagName === 'use') {
          document.querySelector(node.getAttribute('xlink:href')!)!.remove();
          (node.parentNode as any).replaceWith(svg);
        } else {
          node.replaceWith(svg);
        }
      }
    };

    this.patchCSS = (src: string) => {
      const node = document.querySelector(`link[href^="${this.browser.prefix}/${src}"]`) as HTMLLinkElement;
      const href = node.getAttribute('href')!.split('?')[0];
      node.href = `${href}?_=${Date.now()}`;
    };

    this.patch = (sources: string[]) => {
      let handled = false;
      for (const src of sources) {
        if (src.includes('.svg')) {
          this.patchSVG(src);
          handled = true;
          continue;
        }
        if (src.includes('.css')) {
          this.patchCSS(src);
          handled = true;
        }
      }
      return handled;
    };

    // window.onbeforeunload = () => this.close() || null;

    const queue: Array<(_jamrock: any) => any> = [];

    let wait: ReturnType<typeof setTimeout>;
    let readyOk: boolean;
    const run = async () => {
      if (this.browser.paused) {
        clearTimeout(wait);
        wait = setTimeout(run, 120);
        return;
      }

      if (!readyOk) {
        readyOk = true;
        this.browser.paused = true;
        await this.browser.runtime();
        this.browser.paused = false;
      }

      requestAnimationFrame(() => queue.length > 0 && Promise.resolve(queue.shift()!((window as any).Jamrock)).then(run));
    };

    const refresh = (e: any) => {
      try {
        if (e?.isTrusted) {
          // window.frames.top.Jamrock.Components.reload(e.data);
          (window as any).frames.top.Jamrock.Browser.reload(null, true);
        } else {
          // window.Jamrock.Components.reload(e.data);
          (window as any).Jamrock.Browser.reload(null, true);
        }
      } catch (error) {
        console.error('Error reloading:', error);
        (window as any).Jamrock.Browser.reload(null, true);
      }
    };

    let sseSocket: any;
    this.start = () => {
      if (sseSocket) {
        sseSocket.close();
        sseSocket = null;
      }

      sseSocket = createSSESocket(this.uuid, this.browser.prefix, (data: string) => {
        if (data === 'refresh') {
          refresh({ isTrusted: true });
          return;
        }

        if (data.indexOf('reload ') === 0) {
          const [, ...sources] = data.split(/\s+/).filter(Boolean);

          if (!sources.length || sources.includes(this.document)) {
            refresh({ isTrusted: true });
          } else {
            const patched = this.patch(sources);
            if (!patched) {
              refresh({ isTrusted: true });
            }
          }
          return;
        }

        if (data.indexOf('welcome ') === 0) {
          console.debug(data, this.location);
          this.ready = true;
          return;
        }

        if (data.indexOf('rpc:') === 0) {
          const payload = data.substr(4);
          const body = payload.includes('\t')
            ? payload.substr(0, payload.indexOf('\t'))
            : payload;

          const chunk = payload.substr(body.length + 1);

          let msgData: any = {};
          if (!(chunk === 'null' || chunk === 'undefined')) {
            msgData = JSON.parse(decode(chunk));
          }

          const [task, ...args] = body.split(/\s+/);

          if (args[0] !== this.uuid) return;

          if (task === 'response') {
            console.log('[RESPONSE]', msgData);
            this.browser.sync(msgData, spaNavigate);
            return;
          }

          if (task === 'failure') {
            this.browser.warn(msgData, 'SSE Failure');
            return;
          }

          if (task !== 'update') {
            console.debug('RPC', task, args);
            return;
          }

          queue.push(({ Fragment }: any) => {
            try {
              let direction = 0;
              if (args[2] === 'append') direction = 1;
              if (args[2] === 'prepend') direction = -1;
              if (args[0] !== this.uuid) return;

              return Fragment.patch(args[1], msgData, direction);
            } catch (_e) {
              return this.browser.warn(_e, `Failed to ${task} fragment '${args[1]}'`);
            }
          });
          throttle(run, 60);
        }
      });

      ws = sseSocket;
      this.send = (...args: any[]) => {
        if (sseSocket && sseSocket.readyState === sseSocket.OPEN) {
          sseSocket.send(args[0]);
          if (args[1]) args[1]();
        }
      };
    };

    this.next = (_uuid: string) => {
      if (ws && ws.readyState === ws.OPEN) ws.send(`rpc:reconnect ${this.browser.request_uuid = _uuid}`);
    };

    // Reconnect via SSE if disconnected
    this.sync = () => {
      if (this.headless || connecting || (ws && ws.readyState === ws.OPEN)) return;
      connecting = true;
      this.start();
      connecting = false;
      this.ready = true;
    };
  }
}
