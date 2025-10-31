// @ts-check

import { Template } from '../main.mjs';

import { createSession } from './session.mjs';
import { getError, parseCookies } from './request.mjs';

/**
 * @import {IncomingMessage} from "node:http"
 */

/**
 * The attached `req` field on `jamrock:conn`.
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
 * Definition of every route found on the sources.
 * @typedef {object} RouteInfo
 * @property {string}                   src - The route is defined here
 * @property {string}                   path - The extracted route path
 * @property {string}                   verb - The extracted route method
 * @property {Record<string, string>}   params - Any matched path parameter
 * @property {string}                   error - Attached error template
 * @property {string}                   layout - Attached layout template
 * @property {string}                   middleware - Attached middleware from source
 * @property {string[]}                 middlewares - All middlewared found from the source
 */

/**
 * Just the server configuration.
 * @typedef {object} ServerInfo
 * @property {number}    port - Number port
 * @property {string}    host - Hostname string
 * @property {string}    proto - Either http or https, etc.
 * @property {function}  teardown - Calling this will stop the server
 */

/**
 * Individual properties of a cookie.
 * @typedef {object} CookieOptions
 * @property {number}   [maxAge] - Duration in secs
 * @property {string}   [domain] - Optional domain cookie
 * @property {string}   [path] - Where the cookie is placed
 * @property {Date}     [expires] - Expiration in secs, or a Date
 * @property {boolean}  [httpOnly] - Restrict the cookies for HTTP
 * @property {boolean}  [secure] - Ensure cookies are secure
 * @property {string}   [sameSite] - Configures the same for a cookie
 */

/**
 * Every cookie saved in `conn.resp_cookies`.
 * @typedef {object} CookieItem
 * @property {string}         value - Just the value
 * @property {CookieOptions}  [options] - Cookie settings
 */

/**
 * The `jamrock:conn` value.
 * @typedef {object} Connection
 * @property {RequestConnection}        req - Enhanced request object
 * @property {string}                   method - The request method
 * @property {boolean}                  is_close - `true` if request cannot be extended
 * @property {boolean}                  is_json - `true` if client supports or asks for JSON
 * @property {boolean}                  is_xhr - `true` if client requested with XHR headers set
 * @property {RouteInfo[]}              routes - All registered routes from components and middleware
 * @property {ServerInfo}               server - Server details and configuration
 * @property {Record<string, string>}   headers - The requested headers
 * @property {string}                   base_url - The value used for `<base href="..." />`
 * @property {string}                   csrf_token - Used for keeping requests bit more safe
 * @property {ResponseBody}             resp_body - Read or set the response body
 * @property {string[]}                 path_info - An array of the url segments
 * @property {number}                   status_code - Read or set the response status
 * @property {Map<string, CookieItem>}  resp_cookies - Configure the response cookies
 * @property {Headers}                  resp_headers - Configure the response headers
 * @property {string}                   request_path - The requested URL without the `base_url`
 * @property {string}                   current_path - The resolved component or middleware (if any)
 * @property {string}                   current_module - The loaded component or middleware (if any)
 * @property {Record<string, string>}   current_options - The options from the loaded component or middleware (if any)
 */

/**
 * @typedef {string | null | Buffer} ResponseBody
 */

/**
 * The actual response result.
 * @typedef {object} ResponseResult
 * @property {boolean}                  open - Returns `true` if the response has no body or status set
 * @property {ResponseBody}             body - The actual response, it can be string, Buffer, etc.
 * @property {number}                   status - The status code for the actual response
 * @property {Headers}                  headers - The response headers
 * @property {Map<string, CookieItem>}  cookies - The response cookies
 */

/**
 * Creates the connection object for a given request.
 * @param {any}                 store - Store adapter for sessions
 * @param {any}                 options - Shared configuration
 * @param {RequestConnection}   request - Request object with extensions
 * @param {any}                 location - Location object from server
 * @param {any}                 teardown - Callback to shutdown the server
 * @returns {Promise<Partial<Connection>>}
 */
export async function createConnection(store, options, request, location, teardown) {
  /**
   * @type {ResponseResult}
   */
  const response = {
    headers: new Headers(),
    cookies: new Map(),
    status: 0,
    body: null,
    open: true,
  };

  const _headers = Object.fromEntries(request.headers);
  const cookies = parseCookies(_headers.cookie || '');

  const host = request.headers.get('host') || location.host;
  const port = request.headers.get('port') || location.port;
  const proto = +port === 443 ? 'https' : 'http';
  const offset = request.url.indexOf(':');

  const base = request.url.substr(offset + host.length + 3);
  const _url = base.split('?')[0];
  const qs = base.split('?')[1] || '';

  const { sid, session, nextToken, verifyToken } = await createSession(store, cookies.sid || '$');

  response.cookies.set('sid', { value: request.sid = sid });

  request.uuid = qs.match(/^_=([^&]+)$/)?.[1]
    || request.headers.get('request-uuid')
    || `0.${Date.now().toString(36).replace(/.{3}/g, '$&-')}`;

  request.query = Object.fromEntries(new URLSearchParams(qs));
  request.type = (_headers['content-type'] || '').split(';')[0];
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
          || _headers['csrf-token']
          || _headers['xsrf-token']
          || _headers['x-csrf-token']
          || _headers['x-xsrf-token'];

        if (!verifyToken(token, session.csrf)) {
          throw getError(403, 'the given csrf-token is not valid');
        }
        delete session.csrf;
      }
    },
  });

  /**
   * The connection details for the server.
   * @type {ServerInfo}
   */
  const serverInfo = { teardown, proto, host, port };

  const conn = {
    req: request,
    store: store.shared,
    method: request.method,
    server: serverInfo,
    headers: _headers,
    base_url: '/',
    cookies,
    session,
    options,

    /**
     * Sets a cookie for the actual response.
     * @param {string}          key - The cookie name or key
     * @param {string}          value - The cookie value as string
     * @param {CookieOptions}   config - Additional cookie settings (maxAge, expires, etc.)
     */
    cookie(key, value, config) {
      if (value === null) {
        config = { expires: new Date(0) };
      }
      if (typeof config === 'number') {
        config = { expires: new Date(Date.now() + (config * 1000)) };
      }
      response.cookies.set(key, { value, options: config });
    },

    /**
     * Sets a header for the actual resopnse.
     * @param {string}  key - The header name or key
     * @param {string}  value - The header value as stirng
     */
    header(key, value) {
      response.headers.set(key, value);
    },

    /**
     * Sets the status code for the actual response without ending it.
     * @param {number}  code - The status code (either a 2xx, 4xx, etc.)
     */
    status(code) {
      conn.status_code = code;
      response.open = true;
    },

    /**
     * Sets the location header in the actual response endind it.
     * @param {string}  url - The redirection URL
     * @param {number=}  code - The redirection status code (default: 301)
     */
    redirect(url, code) {
      conn.status_code = code || 301;
      response.open = false;
      response.headers.set('location', url);
    },

    /**
     * Connection details without body.
     */
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
     * Appends a message into the session-flash.
     * @param {string}  type - The kind of message (i.e. info, error, success, etc.)
     * @param {string}  value - The full message to be flashed
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
     * Makes the actual response fail.
     * @param {number}            code - Status code for the error
     * @param {string}            message - Message or exception description
     */
    raise(code, message) {
      throw getError(code, message);
    },

    /** Completes the actual response by settings its status, body and headers.
     * @param {number}                  code - Status code for the response
     * @param {string}                  body - Final body for the response
     * @param {Record<string, string>}  headers - Additional headers for
     */
    send(code, body, headers) {
      ([code, body, headers] = Template.plain(code, body, headers));

      conn.status_code = code;
      conn.resp_body = body;
      response.open = false;

      if (headers) {
        Object.entries(headers).forEach(([k, v]) => {
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
      return _url.split('/').filter(x => x.length > 0);
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
      return session.csrf || (session.csrf = nextToken());
    },
    get resp_cookies() {
      return response.cookies;
    },
    get resp_headers() {
      return response.headers;
    },

    /**
     * Returns the actual status code if set or 200.
     */
    get status_code() {
      return response.status || 200;
    },
    /**
     * When set, it terminates the response.
     */
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
      return _headers['content-type'] === 'application/json'
        || _headers.accept?.split(/[\s;,]/).includes('application/json');
    },
    get is_xhr() {
      return _headers['x-requested-with'] === 'XMLHttpRequest';
    },
  };

  return conn;
}
