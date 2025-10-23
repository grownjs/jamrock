import { Template } from 'jamrock/core';

import { createSession } from './session.mjs';
import { getError, parseCookies } from './request.mjs';

export async function createConnection(store, options, request, location, teardown) {
  const response = {
    headers: new Headers(),
    cookies: new Map(),
    status: null,
    body: null,
  };

  const headers = Object.fromEntries(request.headers);
  const cookies = parseCookies(headers.cookie || '');

  const host = request.headers.get('host') || location.host;
  const port = request.headers.get('port') || location.port;
  const proto = +port === 443 ? 'https' : 'http';
  const offset = request.url.indexOf(':');

  const base = request.url.substr(offset + host.length + 3);
  const url = base.split('?')[0];
  const qs = base.split('?')[1] || '';

  const { sid, session, nextToken, verifyToken } = await createSession(store, cookies.sid || '$');

  response.cookies.set('sid', { value: request.sid = sid });
  request.query = Object.fromEntries(new URLSearchParams(qs));
  request.type = (headers['content-type'] || '').split(';')[0];
  request.fields = { ...request.query };

  let parsed;
  Object.defineProperty(request, 'parseBody', {
    async value() {
      if (!parsed) {
        let values = {};
        if (request.type === 'application/x-www-form-urlencoded') {
          values = Object.fromEntries(new URLSearchParams(await request.text()));
        } else if (request.type === 'multipart/form-data') {
          values = Object.fromEntries(await request.formData());
        } else if (request.type === 'application/json') {
          values = await request.json();
        }
        Object.assign(request.fields, values);
        parsed = true;
      }
      return request.fields;
    },
  });

  Object.defineProperty(request, 'csrfProtect', {
    value() {
      if (!(process.env.HEADLESS || ['GET', 'HEAD', 'OPTIONS'].includes(request.method))) {
        const token = (request.fields && request.fields._csrf)
          || request.query._csrf
          || headers['csrf-token']
          || headers['xsrf-token']
          || headers['x-csrf-token']
          || headers['x-xsrf-token'];

        if (!verifyToken(token, session.csrf)) {
          throw getError(403, 'the given csrf-token is not valid');
        }
        delete session.csrf;
      }
    },
  });

  const conn = {
    req: request,
    store: store.shared,
    method: request.method,
    server: { teardown, proto, host, port },
    base_url: '/',
    cookies,
    session,
    headers,
    options,
    cookie(key, value, _options) {
      if (value === null) {
        _options = { expires: new Date(0) };
      }
      if (typeof _options === 'number') {
        _options = { expires: Date.now() + (_options * 1000) };
      }
      response.cookies.set(key, { value, options: _options });
    },
    header(key, value) {
      response.headers.set(key, value);
    },
    status(code) {
      conn.status_code = code;
      response.open = true;
    },
    redirect(_url, code) {
      conn.status_code = code || 301;
      response.open = false;
      response.headers.set('location', _url);
    },
    toJSON() {
      return {
        csrf: conn.csrf_token,
        uuid: conn.req.uuid,
        path: conn.request_path,
        query: conn.query_params,
        method: conn.method,
        params: conn.path_params,
      };
    },
    flash(type, value) {
      if (!type) {
        const data = session.flash || [];
        session.flash = [];
        return data;
      }

      const timestamp = new Date();
      session.flash = session.flash || [];
      session.flash.push({ type, value, timestamp });
    },
    raise(code, message, exception) {
      throw getError(code, message, exception);
    },
    send(code, body, _headers) {
      ([code, body, _headers] = Template.plain(code, body, _headers));

      conn.status_code = code;
      conn.resp_body = body;
      response.open = false;

      if (_headers) {
        Object.entries(_headers).forEach(([k, v]) => {
          conn.resp_headers.set(k, v);
        });
      }
    },
    get aborted() {
      return request.signal.aborted;
    },
    get params() {
      return { ...conn.query_params, ...conn.body_params, ...conn.path_params };
    },
    get path_info() {
      return url.split('/').filter(x => x.length > 0);
    },
    get path_params() {
      return { ...request.params };
    },
    get body_params() {
      return { ...request.fields };
    },
    get request_path() {
      return url;
    },
    get query_string() {
      return qs.replace(/=$/, '');
    },
    get query_params() {
      return { ...request.query };
    },
    get csrf_token() {
      // eslint-disable-next-line no-return-assign
      return session.csrf || (session.csrf = nextToken());
    },
    get resp_cookies() {
      return response.cookies;
    },
    get resp_headers() {
      return response.headers;
    },
    get status_code() {
      return response.status || 200;
    },
    set status_code(number) {
      if (response.status !== null) {
        throw new Error(`Response status already set: ${response.status}`);
      }
      if (!number) {
        throw new Error(`Response status is required, given '${number}'`);
      }
      response.status = number;
    },
    get resp_body() {
      return response.body || null;
    },
    set resp_body(value) {
      if (response.body !== null) {
        throw new Error(`Reponse body already set: ${response.body}`);
      }
      response.body = value;
    },
    get has_body() {
      return response.body !== null;
    },
    get is_close() {
      return !response.open && (
        response.body !== null
        || response.status !== null
        || response.headers.has('location')
      );
    },
    get is_json() {
      return headers['content-type'] === 'application/json'
        || headers.accept?.split(/[\s;,]/).includes('application/json');
    },
    get is_xhr() {
      return headers['x-requested-with'] === 'XMLHttpRequest';
    },
  };

  return conn;
}
