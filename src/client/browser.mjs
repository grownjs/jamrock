import { Fragment } from './fragment.mjs';

const script = document.currentScript;

window.req_uuid = window.req_uuid || script.getAttribute('src').split('/')[2];
script.parentNode.removeChild(script);

function isHTML(value) {
  return value.substr(0, 100).trim().charAt() === '<';
}

function updatePage(title, url) {
  if (url === location.href) return;
  history.pushState(null, title, url);
}

export class Browser {
  static get src() {
    return script.getAttribute('src');
  }

  static get uuid() {
    return window.req_uuid;
  }

  static get failed() {
    return Browser.$.request
      && Browser.$.request.status >= 500;
  }

  static reload(on) {
    if (on === 'css') {
      [].slice.call(document.getElementsByTagName('link')).forEach(elem => {
        if (elem.href && String(elem.rel).toLowerCase() === 'stylesheet') {
          const copy = elem.cloneNode();
          const url = elem.href.replace(/(&|\?)nocache=\d+/, '');
          copy.href = [url, (url.indexOf('?') >= 0 ? '&' : '?'), 'nocache=', Date.now()].join('');

          document.head.insertBefore(copy, elem);
          document.head.removeChild(elem);
        }
      });
    } else {
      const nextUrl = location.href.replace(location.origin, '') || '/';

      if ((Browser.ws && Browser.ws.__dirty) || Browser.failed) {
        location.href = nextUrl;
      } else {
        const kind = window.__live && on ? 'live' : 'link';

        if (kind === 'live' && Browser.REQUEST_CALL) {
          const headers = Browser.REQUEST_CALL[4] || {};

          if (headers['request-type'] === 'bind') {
            headers['request-type'] = 'live';
          }
          Browser.load(...Browser.REQUEST_CALL);
          return;
        }

        Browser.load(null, null, null, 'GET', { 'request-type': kind }, nextUrl, () => {
          updatePage(document.title, nextUrl);
        });
      }
    }
  }

  static live() {
    if ('WebSocket' in window && !window.__live) {
      window.__live = new Date().toISOString();

      const protocol = location.protocol === 'http:' ? 'ws://' : 'wss://';
      const address = [protocol, location.host, location.pathname, '/ws'].join('');
      const socket = new WebSocket(address);

      console.debug('LIVE_RELOAD enabled');

      socket.onmessage = msg => {
        console.debug('LIVE_RELOAD', msg.data);
        if (msg.data === 'reload') Browser.reload(true);
        if (msg.data === 'refreshcss') Browser.reload('css');
      };
    }
  }

  static init(socket) {
    Browser.$ = {};
    Browser.ws = socket;

    const csrf = document.querySelector('meta[name="csrf-token"]');
    const token = csrf && csrf.getAttribute('content');

    Object.defineProperty(Browser, 'csrf', {
      get: () => (Browser.$.request && Browser.$.request.csrf) || token,
    });
  }

  static send(...args) {
    return Browser.ws
      && Browser.ws.try
      && Browser.ws.try(...args);
  }

  static req(url, data, method, headers) {
    let multipart;
    if (data instanceof FormData) {
      data.forEach(value => {
        if (value instanceof File) multipart = true;
      });
    }

    url = url || location.pathname;
    data = data && !multipart ? new URLSearchParams(data) : data;

    return fetch(url, {
      body: (['POST', 'PUT', 'PATCH'].includes(method) && data) || undefined,
      method: method || 'GET',
      redirect: 'follow',
      credentials: 'same-origin',
      headers: {
        accept: 'text/plain,text/html,application/json',
        'cache-control': 'max-age=0, no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
        'x-requested-with': 'XMLHttpRequest',
        'csrf-Token': Browser.csrf,
        ...(data && !multipart ? { 'content-type': 'application/x-www-form-urlencoded' } : null),
        ...(Browser.uuid ? { 'request-uuid': Browser.uuid } : null),
        ...headers,
      },
    }).then(async resp => {
      const body = await resp.text();

      if (resp.redirected && resp.url.includes(location.host)) {
        updatePage('', resp.url.replace(location.origin, ''));
      }

      Browser.__dirty = resp.status === 404 || resp.status >= 500;
      return body;
    }).catch(e => {
      e.message = `Could not reach '${method || 'GET'} ${
        url.replace(location.origin, '')
      }' (${e.message})`;
      throw e;
    });
  }

  static load(el, url, data, method, headers, _location, _callback) {
    if (window.__live) {
      Browser.REQUEST_CALL = [...arguments];
    }

    const fragment = Browser._.lookup('fragment', el) || null;
    const target = Browser._.lookup('confirm', el) || el;

    if (target
      && method === 'DELETE'
      && target.dataset.confirm
      && !confirm(target.dataset.confirm)) return; // eslint-disable-line

    Browser.end();
    Fragment.stop();

    if (el) el.classList.add('loading');

    if (fragment) {
      headers = headers || {};
      headers['request-ref'] = fragment.dataset.fragment;
    }

    return Browser.req(url || _location, data, method, headers).then(async result => {
      if (!(result.charAt() === '{' && result.substr(-1) === '}')) {
        if (isHTML(result)) {
          Browser.redraw(result);
        } else if (result) {
          throw new TypeError(result);
        }
        return _callback && _callback(target, result);
      }

      if (!(Browser.ws && Browser.ws.__ready)) {
        const tpl = JSON.parse(result);

        if (!Browser.$.markup) {
          Object.assign(Browser.$, tpl);
        }
        await Browser.render(tpl);
      }
      return _callback && _callback(target, result);
    }).then(() => {
      if (el && method === 'GET') {
        updatePage('', _location);
        Browser.send(`rpc:request ${Browser.uuid}\t${_location}`);
      }
    }).catch(e => {
      if (isHTML(e.message)) {
        return Browser.redraw(e.message);
      }
      Browser.warn(e, 'Request Failure');
    }).then(() => {
      if (el) {
        el.classList.remove('loading');
      }
    });
  }

  static redraw(html) {
    document.open();
    document.write(html);
    document.close();
  }

  static render(data) {
    console.debug('RENDER');
    return Promise.all([
      Browser._.js(data.scripts),
      Browser._.set(data.markup.head, data.styles),
      Browser._.dom(document.body, data.markup.body),
    ]).then(() => {
      Browser._.log(data.debug);
    });
  }

  static warn(...args) {
    Browser._.warn(...args);
  }

  static end() {
    Browser.send(`rpc:disconnect ${Browser.uuid}`);
  }
}
