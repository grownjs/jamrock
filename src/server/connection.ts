import { Template } from '../main.ts';

import { getError } from './request.ts';

export function createConnection(store: any, session: any, cookies: any, options: any, request: any, location: any, teardown: any): any {
  const response: any = {
    headers: new Headers(),
    cookies: new Map(),
    status: 0,
    body: null,
    open: true,
  };

  const _headers = Object.fromEntries(request.headers);

  const hostname = request.headers.get('host') || location.hostname;
  const port = request.headers.get('port') || location.port;
  const protocol = +port === 443 ? 'https' : 'http';
  const offset = request.url.indexOf(':');

  const base = request.url.substr(offset + hostname.length + 3);
  const _url = base.split('?')[0];
  const qs = base.split('?')[1] || '';

  response.cookies.set('sid', { value: request.sid = session.sid });

  request.uuid = qs.match(/^_=([^&]+)$/)?.[1]
    || request.headers.get('request-uuid')
    || `0.${Date.now().toString(36).replace(/.{3}/g, '$&-')}`;

  request.query = Object.fromEntries(new URLSearchParams(qs));
  request.type = (_headers['content-type'] || '').split(';')[0];
  request.fields = { ...request.query };

  let parsed = false;
  Object.defineProperty(request, 'parseBody', {
    async value() {
      if (!parsed) {
        let values: any = {};
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
          || _headers['csrf-token']
          || _headers['xsrf-token']
          || _headers['x-csrf-token']
          || _headers['x-xsrf-token'];

        if (!session.verifyToken(token, session.state.csrf)) {
          throw getError(403, 'the given csrf-token is not valid');
        }
        delete session.state.csrf;
      }
    },
  });

  const serverInfo = { teardown, protocol, hostname, port };

  const conn: any = {
    req: request,
    store: store.shared,
    method: request.method,
    server: serverInfo,
    headers: _headers,
    base_url: options.target || '/',
    session: session.state,
    cookies,
    options,
    routes: [],
    current_path: '',
    current_module: '',
    current_options: {},
    cookie(key: string, value: any, config?: any) {
      if (value === null) {
        config = { expires: new Date(0) };
      }
      if (typeof config === 'number') {
        config = { expires: new Date(Date.now() + (config * 1000)) };
      }
      response.cookies.set(key, { value, options: config });
    },
    header(key: string, value: string) {
      response.headers.set(key, value);
    },
    status(code: number) {
      conn.status_code = code;
      response.open = true;
    },
    redirect(url: string, code?: number) {
      conn.status_code = code || 301;
      response.open = false;
      response.headers.set('location', url);
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
    flash(type?: string, value?: any) {
      if (!type) {
        const data = session.state.flash || [];
        session.state.flash = [];
        return data;
      }

      const timestamp = new Date();
      session.state.flash = session.state.flash || [];
      session.state.flash.push({ type, value, timestamp });
    },
    raise(code: number, message: string) {
      throw getError(code, message);
    },
    send(code: number, body: any, headers?: any) {
      ([code, body, headers] = Template.plain(code, body, headers));

      conn.status_code = code;
      conn.resp_body = body;
      response.open = false;

      if (headers) {
        Object.entries(headers).forEach(([k, v]: [string, any]) => {
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
      return _url.split('/').filter((x: string) => x.length > 0);
    },
    get path_params() {
      return { ...request.params };
    },
    get body_params() {
      return { ...request.fields };
    },
    get request_path() {
      return _url;
    },
    get query_string() {
      return qs.replace(/=$/, '');
    },
    get query_params() {
      return { ...request.query };
    },
    get csrf_token() {
      // eslint-disable-next-line no-return-assign
      return session.state.csrf || (session.state.csrf = session.nextToken());
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
    set status_code(number: number) {
      if (response.status > 0) {
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
    set resp_body(value: any) {
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
        || response.status > 0
        || response.headers.has('location')
      );
    },
    get is_json() {
      return _headers['content-type'] === 'application/json'
        || _headers.accept?.split(/[\s;,]/).includes('application/json');
    },
    get is_xhr() {
      return _headers['x-requested-with'] === 'XMLHttpRequest';
    },
  };

  return conn;
}
