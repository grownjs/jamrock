import { decode } from '../utils/client.mjs';

const protocol = location.protocol === 'http:' ? 'ws' : 'wss';

export class LiveSocket {
  constructor(browser) {
    Object.defineProperty(this, 'uuid', {
      get: () => browser.request_uuid,
    });

    this.ready = false;
    this.browser = browser;
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

    // FIXME: try sending blob to ws...
    this.submit = () => {
      // function sendFile() {
      //            var file = document.getElementById('filename').files[0];
      //            var reader = new FileReader();
      //            var rawData = new ArrayBuffer();
      //            reader.loadend = function() {
      //            }
      //            reader.onload = function(e) {
      //                rawData = e.target.result;
      //                ws.send(rawData);
      //                alert("the File has been transferred.")
      //            }
      //            reader.readAsArrayBuffer(file);
      //        }
    };

    this.trigger = (e, kind, source, trigger, payload, callback) => {
      e.preventDefault();

      const call = trigger.dataset['ws:call'].replace(/\s+/g, '').replace('=>', ' ');
      const id = `#${Date.now().toString(13)}`;

      // how to deal with formData files?
      const data = JSON.stringify(Object.fromEntries(payload));

      this.send(`rpc:trigger ${this.uuid} ${source} ${call}\t${data}`, async () => {
        if (callback) callback(trigger, 'rpc');
        if (!this) return;

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

    window.onbeforeunload = () => this.close() || null;

    function connect(uuid, ready) {
      return new Promise(ok => {
        ws = new WebSocket(`${protocol}://${location.host}`);

        ws.addEventListener('open', () => {
          ws.send(`rpc:connect ${uuid}`);
          interval = 100;
          ready(uuid, ws, ok(ws));
        });

        ws.addEventListener('error', () => {
          setTimeout(() => connect(uuid, ready).then(ok), timeout('connect'));
        });
      });
    }

    function open(uuid, socket) {
      socket.try = (msg, cb) => {
        if (socket.readyState !== socket.OPEN) {
          setTimeout(() => connect(uuid, open).then(() => socket.try(msg, cb)), timeout('open'));
          return;
        }
        socket.send(msg);
        if (cb) cb(socket);
      };
    }

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

    this.next = _uuid => {
      if (ws && ws.readyState === ws.OPEN) ws.send(`rpc:reconnect ${this.browser.request_uuid = _uuid}`);
    };
    this.start = () => (!ws || ws.readyState !== ws.OPEN) && connect(this.uuid, open).then(socket => {
      this.ready = true;

      let t;
      socket.addEventListener('message', e => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (socket.readyState === socket.OPEN) socket.send('alive');
        }, Math.floor(Math.random() * (7500 - 6000)) + 6000);

        if (e.data === 'reload') {
          // FIXME: here we should get a list of files changed... and then,
          // we should remove them from the import-memory and such...
          if (e.isTrusted) {
            window.frames.top.Jamrock.Components.reload(e.data);
            window.frames.top.Jamrock.Browser.reload(null, true);
          } else {
            window.Jamrock.Components.reload(e.data);
            window.Jamrock.Browser.reload(null, true);
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
