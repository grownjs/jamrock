import { sleep, decode } from '../utils/client.mjs';

export function hasHTML(value) {
  return /<\w/.test(value);
}

export function updatePage(title, url) {
  if (url === location.href) return;
  history.pushState(null, title, url);
}

// FIXME: this does not plays well in webcontainers...
export function redrawPage(html) {
  html = html.replace(/<script src="[^<>]+@runtime[^<>]+"><\/script>/, '');
  html = html.replace(/<script type=importmap>[^<>]+<\/script>/, '');

  document.open();
  document.write(html);
  document.close();
}

export function spaNavigate(callback) {
  return document.startViewTransition
    ? document.startViewTransition(callback).finished
    : callback();
}

export function doRequest(url, data, method, headers) {
  let multipart;
  if (data instanceof FormData) {
    data.forEach(value => {
      if (value instanceof File) multipart = true;
    });
  }

  url = url || location.pathname;
  data = data && !multipart ? new URLSearchParams(data) : data;

  if (!method || method === 'GET') {
    if (data) url += `?${data}`;
    updatePage('', url);
  }

  return this.browser.fetch(url, data, method, {
    ...(data && !multipart ? { 'content-type': 'application/x-www-form-urlencoded' } : null),
    ...headers,
  }).then(resp => {
    this.browser.csrf_token = resp.headers.get('x-csrf') || this.browser.csrf_token;
    this.browser.request_failure = resp.status === 404 || resp.status >= 500;

    return resp.text().then(body => {
      if (resp.redirected && resp.url.includes(location.host)) {
        updatePage('', resp.url.replace(location.origin, ''));
      }
      return body;
    });
  }).catch(e => {
    e.message = `Could not reach '${method || 'GET'} ${
      url.replace(location.origin, '')
    }' (${e.message})`;
    throw e;
  });
}

export function loadPage({ el, wait, target, fragment }, url, data, method, _headers, _location, _callback) {
  if (target
    && method === 'DELETE'
    && target.dataset.confirm
    && !confirm(target.dataset.confirm)) return;

  const active = document.activeElement;
  const parent = (el && el.form) || el;

  if (parent) {
    parent.classList.add('loading');
  }

  _headers = _headers || {};

  const [prefix, suffix] = this.browser.request_uuid.split('.');

  _headers['request-uuid'] = [parseInt(prefix, 10) + 1, suffix].join('.');

  if (fragment) _headers['request-ref'] = fragment.dataset.fragment;

  window.Jamrock.LiveSocket.next(_headers['request-uuid']);

  const ms = wait ? wait.dataset.wait : null;

  return doRequest.call(this, url || _location, data, method, _headers).then(body => sleep(ms).then(() => {
    if (!(body.charAt() === '{' && body.substr(-1) === '}')) {
      if (hasHTML(body)) {
        spaNavigate(() => redrawPage(body));
      } else if (body) {
        throw new TypeError(body);
      }
      return _callback && _callback(target, body);
    }

    const payload = JSON.parse(decode(body));

    window.Jamrock.LiveSocket.start();
    window.Jamrock.Components.off();

    return this.browser.runtime().then(() => {
      if (this.browser.teardown) this.browser.teardown();

      this.browser.patch(document.head, payload.head.concat([['style', null, payload.styles.join('\n')]]));
      this.browser.attrs(document.documentElement, payload.doc);
      this.browser.attrs(document.body, payload.attrs);
      this.browser.scripts(payload.scripts);

      return spaNavigate(() => this.browser.patch(document.body, payload.body));
    }).then(() => _callback && _callback(target, body));
  })).then(() => {
    if (parent && method === 'GET') {
      updatePage('', _location);
      if (this.browser.ws) this.browser.ws.try(`rpc:request ${this.browser.uuid}\t${_location}`);
    }
  }).catch(e => {
    if (hasHTML(e.message)) {
      return redrawPage(e.message);
    }
    this.browser.warn(e, 'Request Failure');
  }).then(() => {
    window.Jamrock.Components.on();

    if (parent) {
      parent.classList.remove('loading');
      if (active) active.focus();
    }
  });
}
