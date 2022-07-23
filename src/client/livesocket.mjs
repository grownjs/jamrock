import { Fragment } from './fragment.mjs';
import { Browser } from './browser.mjs';

export class LiveSocket {
  static getInstance() {
    if (!Browser.src.includes('?')) return LiveSocket;

    let interval = 100;
    function timeout(msg) { // eslint-disable-line
      console.debug('RETRY', msg, interval);
      const ms = interval;
      interval *= 2;
      return ms;
    }

    function connect(cb) {
      return new Promise(ok => {
        const protocol = location.protocol === 'http:' ? 'ws' : 'wss';
        const url = `${protocol}://${location.host.split(':')[0]}:${Browser.src.split('?')[1] || 80}`;

        console.debug('CONNECT', url);
        // ws = new WebSocket('ws://localhost:8080');
        // ws.addEventListener('message', console.log);
        LiveSocket.ws.addEventListener('open', () => {
          LiveSocket.ws.send(`rpc:connect ${Browser.uuid}`);
          console.debug('READY', Browser.uuid);
          interval = 100;
          cb(ok());
        });
        LiveSocket.ws.addEventListener('error', () => {
          setTimeout(() => connect(cb).then(ok), timeout('connect'));
        });
      });
    }

    function detach(e, key) {
      console.debug('E_PATCH', e, key);

      LiveSocket.ws.__dirty = true;
      LiveSocket.ws.try(`rpc:disconnect ${Browser.uuid}`);
    }

    function open() {
      LiveSocket.ws.try = (msg, cb) => {
        if (LiveSocket.ws.readyState !== LiveSocket.ws.OPEN) {
          setTimeout(() => connect(open).then(() => LiveSocket.ws.try(msg, cb)), timeout('open'));
          return;
        }
        LiveSocket.ws.send(msg);
        if (cb) cb();
      };
    }
    connect(open).then(() => {
      let t;
      LiveSocket.ws.addEventListener('message', async e => {
        clearTimeout(t);
        t = setTimeout(() => {
          LiveSocket.ws.try('alive');
        }, Math.floor(Math.random() * (7500 - 6000)) + 6000);

        if (e.data.indexOf('welcome ') === 0) {
          LiveSocket.ws.__pending = false;
          console.log(e.data);
          return;
        }

        if (e.data.indexOf('@debug ') === 0) {
          const offset = e.data.indexOf('{');
          const [, kind, args] = e.data.substr(0, offset).split(' ');

          console[kind](...args);
          return;
        }

        if (e.data.indexOf('@html ') === 0) {
          if (LiveSocket.ws.__dirty) {
            console.log('Refusing to apply HTML, please reload the page...');
            return;
          }

          LiveSocket.ws.__pending = true;

          const offset = e.data.indexOf('{');
          const [, kind, code] = e.data.substr(0, offset).split(' ');

          console.debug('LIVE_SOCKET', kind, status);

          Object.assign(Browser.$, JSON.parse(e.data.substr(offset)));
          Object.assign(Browser.$.request, { type: kind, status: +code, initial: !LiveSocket.ws.__ready });

          if (Browser.$.markup.head && Browser.$.styles) Browser._.set(Browser.$.markup.head, Browser.$.styles);

          // FIXME: this should not be idempotent?
          // try to ignore those from loops, in case there are...
          if (!LiveSocket.ws.__ready || !Browser.$.markup.set.length) {
            await Browser._.dom(document.body, Browser.$.markup.body, kind);
          } else {
            await Browser._.sync(Browser.$.markup.set);
          }

          LiveSocket.ws.__pending = false;
          LiveSocket.ws.__ready = true;

          Browser._.js(Browser.$.scripts);
          Browser._.log(Browser.$.debug);

          if (Browser.__dirty) {
            window.onpopstate = () => location.reload();
          }
          return;
        }

        if (e.data.indexOf('rpc:') !== 0) return;

        const payload = e.data.substr(4);
        const body = payload.includes('\t')
          ? payload.substr(0, payload.indexOf('\t'))
          : payload;

        const data = JSON.parse(payload.substr(body.length + 1));
        const [task, ...args] = body.split(/\s+/);

        Promise.resolve()
          .then(() => {
            if (LiveSocket.ws[args[0]]) {
              return LiveSocket.ws[args[0]][task === 'failure' ? 'reject' : 'resolve'](data);
            }

            if (task === 'failure') {
              Browser._.warn(data, 'WebSocket Failure');
            }
          })
          .then(() => {
            if (LiveSocket.ws.__dirty) {
              console.log('Refusing to patch document, please reload the page...');
              return;
            }
            if (task === 'update') {
              let direction = 0;
              if (args[1] === 'append') direction = 1;
              if (args[1] === 'prepend') direction = -1;
              return Fragment.with(args[0], frag => frag.sync(data, direction)).catch(_e => detach(_e, args[0]));
            }
            if (task === 'append') {
              return Fragment.with(args[0], frag => frag.append(data)).catch(_e => detach(_e, args[0]));
            }
            if (task === 'replace') {
              return Fragment.with(args[0], frag => frag.patch(data)).catch(_e => detach(_e, args[0]));
            }
          });
      });
    });

    return LiveSocket;
  }

  static ready(cb, retries = 0) {
    if (!LiveSocket.ws || !LiveSocket.ws.__ready || LiveSocket.ws.__pending) {
      if (retries++ > 150) {
        throw new ReferenceError('LiveSocket is not ready yet!');
      }

      Browser._.raf(() => LiveSocket.ready(cb, retries + 1));
    } else {
      cb({ ...Browser.$.request, initial: false });
    }
  }
}
