import { getError, parseCookies } from './request.mjs';
import { createSession } from './session.mjs';

export function unsafeProtection(key) {
  const symbol = Symbol(`@@unsafe${key || Date.now()}`);
  const protect = v => {
    if (!v || Object.prototype.toString.call(v) !== '[object Object]' || symbol in v) return v;
    Object.defineProperty(v, symbol, { value: 1 });
    return v;
  };
  const is_unsafe = v => Object.prototype.toString.call(v) === '[object Object]' && symbol in v;
  return { protect, is_unsafe };
}

export async function createConnection(store, options, request, location, teardown) {
  const protection = unsafeProtection(options.key);

  const response = {
    headers: new Headers(),
    cookies: new Map(),
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
      if (!(process.headless || ['GET', 'HEAD', 'OPTIONS'].includes(request.method))) {
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
    status_code: response.return || null,
    resp_body: response.body || null,
    base_url: '/',
    cookies,
    session,
    headers,
    options,
    cookie(key, value, _options) {
      if (value === null) {
        _options = { expires: new Date(0) };
      }
      response.cookies.set(key, { value, options: _options });
    },
    header(key, value) {
      response.headers.set(key, value);
    },
    redirect(_url, code) {
      conn.status_code = code || 301;
      response.headers.set('location', _url);
    },
    protect(v) {
      return protection.protect(v);
    },
    unsafe(v) {
      return [cookies, session, headers, request, options].includes(v) || protection.is_unsafe(v);
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

      session.flash = session.flash || [];
      session.flash.push({ type, value });
    },
    raise(code, message) {
      throw getError(code, message);
    },
    get aborted() {
      return request.signal.aborted;
    },
    get params() {
      return protection.protect({ ...conn.query_params, ...conn.body_params, ...conn.path_params });
    },
    get path_info() {
      return url.split('/').filter(x => x.length > 0);
    },
    get path_params() {
      return { ...request.params };
    },
    get body_params() {
      return protection.protect({ ...request.fields });
    },
    get request_path() {
      return url;
    },
    get query_string() {
      return qs.replace(/=$/, '');
    },
    get query_params() {
      return request.query;
    },
    get csrf_token() {
      // eslint-disable-next-line no-return-assign
      return session.csrf || (session.csrf = nextToken());
    },
    get resp_cookies() {
      return protection.protect(response.cookies);
    },
    get resp_headers() {
      return protection.protect(response.headers);
    },
    get has_body() {
      return conn.resp_body !== null;
    },
    get has_status() {
      return conn.status_code !== null || response.headers.has('location');
    },
    get is_xhr() {
      return headers['x-requested-with'] === 'XMLHttpRequest';
    },
    get env() {
      return protection.protect({ ...process.env });
    },
  };

  return conn;
}
