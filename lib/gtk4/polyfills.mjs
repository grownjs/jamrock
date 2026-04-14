// Polyfills for SSR build (Node.js, Deno, Bun)
// These are pure JS implementations without GJS dependencies

export const util = {
  inspect: obj => String(obj),
  format: (fmt, ...args) => fmt.replace(/%[sdj]/g, () => args.shift()),
  inherits: (ctor, superCtor) => {
    ctor.super_ = superCtor;
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
  },
  isDate: d => d instanceof Date,
  isError: e => e instanceof Error,
  types: {},
  TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : undefined,
  TextDecoder: typeof TextDecoder !== 'undefined' ? TextDecoder : undefined,
};

const _URL = typeof URL !== 'undefined' ? URL : class URL {
  constructor(urlStr) {
    const parts = urlStr.split('://');
    this.protocol = parts[0] ? `${parts[0]}:` : '';
    this.href = urlStr;
    const pathParts = (parts[1] || '').split('/');
    this.host = pathParts[0] || '';
    this.hostname = this.host.split(':')[0];
    this.port = this.host.split(':')[1] || '';
    this.pathname = `/${pathParts.slice(1).join('/')}`;
    this.search = '';
    this.hash = '';
  }
};

const _URLSearchParams = typeof URLSearchParams !== 'undefined' ? URLSearchParams : class URLSearchParams {
  constructor() { this.params = {}; }
  get(key) { return this.params[key]; }
  toString() { return this.params ? '' : ''; }
};

export const url = {
  parse: urlStr => {
    try {
      const urlObj = new _URL(urlStr);
      return {
        href: urlStr,
        protocol: urlObj.protocol,
        host: urlObj.host,
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
      };
    } catch { return null; }
  },
  format: urlObj => (typeof urlObj === 'string' ? urlObj : urlObj.href || ''),
  resolve: (from, to) => {
    if (to.startsWith('/')) return to;
    if (to.includes('://')) return to;
    return from.replace(/[^/]*$/, '') + to;
  },
  URL: _URL,
  URLSearchParams: _URLSearchParams,
};

export const path = {
  join: (...args) => {
    let result = args.join('/').replace(/\/+/g, '/');
    if (result.length > 1 && result.endsWith('/')) result = result.slice(0, -1);
    return result || '.';
  },
  dirname: p => {
    const parts = p.split('/');
    parts.pop();
    if (parts.length === 0) return '.';
    if (parts.length === 1 && parts[0] === '') return '/';
    return parts.join('/');
  },
  basename: p => p.split('/').pop(),
  extname: p => {
    const base = p.split('/').pop();
    const idx = base.lastIndexOf('.');
    return idx > 0 ? base.slice(idx) : '';
  },
  resolve: (...args) => {
    let result = args.join('/').replace(/\/+/g, '/');
    if (!result.startsWith('/')) {
      const cwd = typeof process !== 'undefined' ? process.cwd() : '.';
      result = `${cwd}/${result}`;
    }
    return result;
  },
  normalize: p => p.replace(/\/+/g, '/').replace(/\/\.$/, '').replace(/\/\//g, '/'),
  isAbsolute: p => p.startsWith('/'),
  sep: '/',
  delimiter: ':',
};

export const fs = {
  existsSync: () => false,
  readFileSync: () => '',
  writeFileSync: () => {},
  mkdirSync: () => {},
  statSync: () => ({ isFile: () => false, isDirectory: () => false }),
  readdirSync: () => [],
  unlinkSync: () => {},
  rmSync: () => {},
  rmdirSync: () => {},
  copyFileSync: () => {},
  renameSync: () => {},
  promises: {},
  constants: {},
};

export default { util, url, path, fs };
