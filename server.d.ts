import type { IncomingMessage } from "node:http";
import type { Environment } from "./env.d.ts";

export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'PATCH' | 'DELETE';

/**
 * The attached `req` field on `jamrock:conn`.
 */
export type RequestConnection = IncomingMessage & {
  sid: string;
  url: string;
  uuid: string;
  type: string;
  method: HttpMethod;
  protocol: string;
  query: Record<string, string>;
  fields: {
    _method?: HttpMethod;
    [x: string]: string;
  };
  params: Record<string, string>;
  headers: Headers;
  text: () => Promise<string>;
  json: () => Promise<object>;
  formData: () => Promise<FormData>;
  signal: {
    aborted: boolean;
    onabort: () => void;
  };
};

/**
 * Definition of every route found on the sources.
 */
export interface RouteMatch {
  /** The route is defined here */
  src: string;
  /** The extracted route path */
  path: string;
  /** The extracted route method */
  verb: HttpMethod;
  /** Any matched path parameter */
  params: Record<string, string>;
  /** Attached error template */
  error: string;
  /** Attached layout template */
  layout: string;
  /** Attached middleware from source */
  middleware: string;
  /** All middleware found from the source */
  middlewares: string[];
}

/**
 * Just the server configuration.
 */
export interface ServerInfo {
  /** Number port */
  port: number;
  /** Hostname string */
  hostname: string;
  /** Either http or https, etc. */
  protocol: string;
  /** Calling this will stop the server */
  teardown: () => void;
}

/**
 * Individual properties of a cookie.
 */
export interface CookieOptions {
  /** Duration in secs */
  maxAge?: number;
  /** Optional domain cookie */
  domain?: string;
  /** Where the cookie is placed */
  path?: string;
  /** Expiration in secs, or a Date */
  expires?: Date;
  /** Restrict the cookies for HTTP */
  httpOnly?: boolean;
  /** Ensure cookies are secure */
  secure?: boolean;
  /** Configures the same for a cookie */
  sameSite?: string;
}

/**
 * Every cookie saved in `conn.resp_cookies`.
 */
export interface CookieItem {
  /** Just the value */
  value: string;
  /** Cookie settings */
  options?: CookieOptions;
}

/**
 * The `jamrock:conn` value.
 */
export interface Connection {
  /** Enhanced request object */
  req: RequestConnection;
  /** The session store */
  store: any;
  /** The request method */
  method: HttpMethod;
  /** `true` if request cannot be extended */
  is_close: boolean;
  /** `true` if client supports or asks for JSON */
  is_json: boolean;
  /** `true` if client requested with XHR headers set */
  is_xhr: boolean;
  /** All registered routes from components and middleware */
  routes: RouteInfo[];
  /** Server details and configuration */
  server: ServerInfo;
  /** The request cookies */
  cookies: Record<string, string>;
  /** The requested headers */
  headers: Record<string, string>;
  /** Saved session from request */
  session: Record<string, any>;
  /** Shared configuration settings */
  options: Record<string, any>;
  /** The value used for `<base href="..." />` */
  base_url: string;
  /** Used for keeping requests bit more safe */
  csrf_token: string;
  /** Read or set the response body */
  resp_body: ResponseBody;
  has_body: boolean;
  /** An array of the url segments */
  path_info: string[];
  /**
   * Returns the actual status code if set or 200.
   *
   * When set, it terminates the response.
   */
  status_code: number;
  /** The request query params as object */
  query_params: Record<string, string>;
  /** The requested path params as object */
  path_params: Record<string, string>;
  /** Configure the response cookies */
  resp_cookies: Map<string, CookieItem>;
  /** Configure the response headers */
  resp_headers: Headers;
  /** The requested URL without the `base_url` */
  request_path: string;
  /** The resolved component or middleware (if any) */
  current_path: string;
  /** The loaded component or middleware (if any) */
  current_module: string;
  /** The options from the loaded component or middleware (if any) */
  current_options: Record<string, string>;
  /** Sets a cookie for the actual response */
  cookie: (key: string, value: string, config: CookieOptions) => void;
  /** Sets a header for the actual response */
  header: (key: string, value: string) => void;
  /** Sets the status code for the actual response without ending it */
  status: (code: number) => void;
  /** Sets the location header in the actual response endind it */
  redirect: (url: string, code?: number) => void;

  aborted: boolean;
  params: Record<string, any>;
  body_params: Record<string, any>;
  query_string: string;
  path_info: string[];

  /** Connection details without body */
  toJSON: () => {
    csrf: string;
    uuid: string;
    path: string;
    query: Record<string, string>;
    method: HttpMethod;
    params: Record<string, string>;
  };
  /** Appends a message into the session-flash */
  flash: (type: string, value: string) => void;
  /** Makes the actual response fail */
  raise: (code: number, message: string) => void;
  /** Completes the actual response by settings its status, body and headers */
  send: (code: number, body: string, headers: Record<string, string>) => void;
}

/**
 * The actual response result.
 */
export interface ResponseResult {
  /** Returns `true` if the response has no body or status set */
  open: boolean;
  /** The actual response, it can be string, Buffer, etc. */
  body: ResponseBody;
  /** The status code for the actual response */
  status: number;
  /** The response headers */
  headers: Headers;
  /** The response cookies */
  cookies: Map<string, CookieItem>;
}

export type ResponseValue = {
  body: ResponseBody;
  status: number;
  headers?: Headers;
  cookies?: Map<string, CookieItem>;
};

export type ResponseBody = string | null | undefined | Buffer;

export type ResponseMixed = Response | ResponseBody | ResponseValue;

export type RenderCallback = (key: string, item: any) => Promise<{
  target: string;
  vnode: any;
}>;

export type PublishCallback = (ref: string, key: string, item: any, mode: string, render: RenderCallback) => Promise<void>;

export type ConnectionContext = {
  conn: Connection;
  routes: RouteInfo[];
  clients: () => any[];
  called: boolean;
  depth: number;
  route: RouteInfo;
  ready: boolean | null;
  stack: string[];
  cache: any;
  socket: any;
  stream: any;
  publish: PublishCallback;
};
