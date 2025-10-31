// @ts-check

import { Template } from '../main.mjs';

import { createSession } from './session.mjs';
import { getError, parseCookies } from './request.mjs';

/**
 * @import {IncomingMessage} from "node:http"
 */

/**
 * The attached `req` field on `jamrock:conn`
 * @typedef {IncomingMessage & {
 *  sid: string;
 *  url: string;
 *  uuid: string;
 *  type: string;
 *  method: string;
 *  protocol: string;
 *  query: Record<string, string>;
 *  fields: Record<string, string>;
 *  params: Record<string, string>;
 *  headers: Headers,
 *  text: () => Promise<string>;
 *  json: () => Promise<object>;
 *  formData: () => Promise<FormData>;
 *  signal: { aborted: boolean, onabort: function };
 }} RequestConnection
 */

/**
 * Definition of every route found on the sources
 * @typedef {object} RouteInfo
 * @property {string}                   src   - The route is defined here
 * @property {string}                   path    - The extracted route path
 * @property {string}                   verb    - The extracted route method
 * @property {Record<string, string>}   params    - Any matched path parameter
 * @property {string}                   error   - Attached error template
 * @property {string}                   layout    - Attached layout template
 * @property {string}                   middleware    - Attached middleware from source
 * @property {string[]}                 middlewares   - All middlewared found from the source
 */

/**
 * Just the server configuration
 * @typedef {object} ServerInfo
 * @property {string}    port   - Number port
 * @property {string}    host   - Hostname string
 * @property {string}    proto    - Either http or https, etc.
 * @property {function}  teardown   - Calling this will stop the server
 */

/**
 * Individual properties of a cookie
 * @typedef {object} CookieOptions
 * @property {number}   [maxAge]    - Duration in secs
 * @property {string}   [domain]    - Optional domain cookie
 * @property {string}   [path]    - Where the cookie is placed
 * @property {Date}     [expires]   - Expiration in secs, or a Date
 * @property {boolean}  [httpOnly]    - Restrict the cookies for HTTP
 * @property {boolean}  [secure]    - Ensure cookies are secure
 * @property {string}   [sameSite]    - Configures the same for a cookie
 */

/**
 * Every cookie saved in `conn.resp_cookies`
 * @typedef {object} CookieItem
 * @property {string}         value   - Just the value
 * @property {CookieOptions}  [options]   - Cookie settings
 */

/**
 * The `jamrock:conn` value
 * @typedef {object} Connection
 * @property {RequestConnection}        req   - Enhanced request object
 * @property {string}                   method    - The request method
 * @property {boolean}                  is_close   - `true` if request cannot be extended
 * @property {boolean}                  is_json   - `true` if client supports or asks for JSON
 * @property {boolean}                  is_xhr   - `true` if client requested with XHR headers set
 * @property {RouteInfo[]}              routes    - All registered routes from components and middleware
 * @property {ServerInfo}               server    - Server details and configuration
 * @property {Record<string, string>}   headers   - The requested headers
 * @property {string}                   base_url    - The value used for `<base href="..." />`
 * @property {string}                   csrf_token    - Used for keeping requests bit more safe
 * @property {string|null|Buffer}       resp_body   - Read or set the response body
 * @property {string[]}                 path_info   - An array of the url segments
 * @property {number}                   status_code   - Read or set the response status
 * @property {Map<string, CookieItem>}  resp_cookies    - Configure the response cookies
 * @property {Headers}                  resp_headers    - Configure the response headers
 * @property {string}                   request_path    - The requested URL without the `base_url`
 * @property {string}                   current_path    - The resolved component or middleware (if any)
 * @property {string}                   current_module    - The loaded component or middleware (if any)
 * @property {Record<string, string>}   current_options   - The options from the loaded component or middleware (if any)
 */

/**
 * Creates the connection object for a given request
 * @param {any}                 store   - Store adapter for sessions
 * @param {any}                 options   - Shared configuration
 * @param {RequestConnection}   request   - Request object with extensions
 * @param {any}                 location    - Location object from server
 * @param {any}                 teardown    - Callback to shutdown the server
 * @returns {Promise<Partial<Connection>>}
 */
export async function createConnection(store, options, request, location, teardown) {
  /**
   * @type {{
   *  open: boolean;
   *  body: string | null;
   *  status: number;
   *  headers: Headers;
   *  cookies: Map<string, CookieItem>;
   * }}
   */
  const response = {
    headers: new Headers(),
    cookies: new Map(),
    status: 0,
    body: null,
    open: true,
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

  request.uuid = qs.match(/^_=([^&]+)$/)?.[1]
    || request.headers.get('request-uuid')
    || `0.${Date.now().toString(36).replace(/.{3}/g, '$&-')}`;

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

  /**
   * @type {ServerInfo}
   */
  const serverInfo = { teardown, proto, host, port };

  const conn = {
    req: request,
    store: store.shared,
    method: request.method,
    server: serverInfo,
    base_url: '/',
    cookies,
    session,
    headers,
    options,

    /**
     * @param {string}          key
     * @param {string}          value
     * @param {CookieOptions}   _options
     */
    cookie(key, value, _options) {
      if (value === null) {
        _options = { expires: new Date(0) };
      }
      if (typeof _options === 'number') {
        _options = { expires: new Date(Date.now() + (_options * 1000)) };
      }
      response.cookies.set(key, { value, options: _options });
    },

    /**
     * @param {string}  key
     * @param {string}  value
     */
    header(key, value) {
      response.headers.set(key, value);
    },

    /**
     * @param {number}  code
     */
    status(code) {
      conn.status_code = code;
      response.open = true;
    },

    /**
     * @param {string}  _url
     * @param {number=}  code
     */
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

    /**
     * @param {string}  type
     * @param {string}  value
     */
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

    /**
     * @param {number}            code
     * @param {string}            message
     * @param {ErrorConstructor}  exception
     */
    raise(code, message, exception) {
      throw getError(code, message, exception);
    },

    /**
     * @param {number}                  code
     * @param {string}                  body
     * @param {Record<string, string>}  _headers
     */
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
        || response.status > 0
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
