import { sleep, decode, updatePage, spaNavigate } from '../utils/client.ts';

export function hasHTML(value: string): boolean {
  return /<\w/.test(value);
}

// FIXME: this does not plays well in webcontainers...
export function redrawPage(html: string): void {
  html = html.replace(/<script src="[^<>]+@runtime[^<>]+"><\/script>/, '');
  html = html.replace(/<script type=importmap>[^<>]+<\/script>/, '');

  document.open();
  document.write(html);
  document.close();
}

export function doRequest(this: any, url: string, data: any, method: string, headers: any): Promise<any> {
  let multipart: boolean | undefined;
  if (data instanceof FormData) {
    data.forEach((value: any) => {
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
  }).then((resp: Response) => {
    this.browser.csrf_token = resp.headers.get('x-csrf') || this.browser.csrf_token;
    this.browser.request_failure = resp.status === 404 || resp.status >= 500;
    this.browser.request_success = resp.status > 199 || resp.status < 300;

    if (resp.status === 204) return;
    return resp.text().then((body: string) => {
      if (resp.redirected && resp.url.includes(location.host)) {
        updatePage('', resp.url.replace(location.origin, ''));
      }
      return body;
    });
  }).catch((e: Error) => {
    e.message = `Could not reach '${method || 'GET'} ${
      url.replace(location.origin, '')
    }' (${e.message})`;
    throw e;
  });
}

export function loadPage(this: any, { el, wait, target, fragment }: { el: any; wait: any; target: any; fragment: any }, url: string, data: any, method: string, _headers: any, _location: string, _callback?: any): Promise<any> {
  const active = document.activeElement;
  const parent = (el && el.form) || el;

  if (!(url || _location)) {
    console.log({ active, data, method });
    throw new Error('Missed location');
  }

  if (parent) {
    parent.classList.add('loading');
  }

  _headers = _headers || {};

  const [prefix, suffix] = this.browser.request_uuid.split('.');

  _headers['request-uuid'] = [parseInt(prefix, 10) + 1, suffix].join('.');

  if (fragment) _headers['request-ref'] = fragment.dataset.fragment;

  (window as any).Jamrock.LiveSocket.next(_headers['request-uuid']);

  const ms = wait ? wait.dataset.wait : null;
  const anchor = (url || _location).split('#').pop();

  return doRequest.call(this, url || _location, data, method, _headers).then((body: any) => sleep(ms).then(() => {
    if (!body) return _callback && _callback(target, null);
    if (!(body[0] === '{' && body.substr(-1) === '}')) {
      if (hasHTML(body)) {
        spaNavigate(() => redrawPage(body));
      } else if (body) {
        throw new TypeError(body);
      }
      return _callback && _callback(target, body);
    }

    console.log('[PAGE]', url || _location);
    this.browser.sync(JSON.parse(decode(body)), spaNavigate, anchor)
      .then(() => _callback && _callback(target, body));
  })).then(() => {
    if (parent && method === 'GET') {
      updatePage('', _location);
    }
  }).catch((e: any) => {
    if (hasHTML(e.message)) return redrawPage(e.message);
    this.browser.warn(e, 'Request Failure');
  }).then(() => {
    if (parent) {
      parent.classList.remove('loading');
      if (active) (active as HTMLElement).focus();
    }
    return this.browser.request_success;
  });
}
