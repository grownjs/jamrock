/* eslint-disable no-undef, class-methods-use-this */
const GLib = imports.gi.GLib;

// URL polyfill
const _URL = typeof URL !== 'undefined' ? URL : class URL {
  constructor(url) {
    const uri = GLib.Uri.parse(url, GLib.UriFlags.NONE);
    this.href = url;
    this.protocol = `${uri.get_scheme()}:`;
    this.host = uri.get_host();
    this.hostname = uri.get_host();
    this.port = uri.get_port();
    this.pathname = uri.get_path();
    this.search = uri.get_query();
    this.hash = uri.get_fragment();
  }
};

const _URLSearchParams = typeof URLSearchParams !== 'undefined' ? URLSearchParams : class URLSearchParams {
  constructor(value) {
    this.params = GLib.Uri.parse_params(value, -1, '&', GLib.UriParamsFlags.NONE);
  }
  get(key) { return this.params[key]; }
  toString() { return Object.entries(this.params).map(([k, v]) => `${k}=${v}`).join('&'); }
};

// Path utilities
const pathJoin = (...args) => {
  let result = args.join('/').replace(/\/+/g, '/');
  if (result.length > 1 && result.endsWith('/')) result = result.slice(0, -1);
  return result || '.';
};

const pathDirname = p => {
  const parts = p.split('/');
  parts.pop();
  if (parts.length === 0) return '.';
  if (parts.length === 1 && parts[0] === '') return '/';
  return parts.join('/');
};

const pathBasename = p => p.split('/').pop();

const pathExtname = p => {
  const base = p.split('/').pop();
  const idx = base.lastIndexOf('.');
  return idx > 0 ? base.slice(idx) : '';
};

const pathResolve = (...args) => {
  let result = pathJoin(...args);
  if (!result.startsWith('/')) result = pathJoin(process.cwd(), result);
  return result;
};

const pathNormalize = p => p.replace(/\/+/g, '/').replace(/\/\.$/, '').replace(/\/\//g, '/');

const pathRelative = (from, to) => {
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
  const up = fromParts.length - i;
  return Array(up).fill('..').concat(toParts.slice(i)).join('/') || '.';
};

const pathParse = p => {
  const base = p.split('/').pop();
  const ext = pathExtname(p);
  return {
    root: p.startsWith('/') ? '/' : '',
    dir: pathDirname(p),
    base,
    ext,
    name: ext ? base.slice(0, -ext.length) : base,
  };
};

// Export util
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
  TextEncoder,
  TextDecoder,
};

// Export url
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
  format: urlObj => typeof urlObj === 'string' ? urlObj : urlObj.href || '',
  resolve: (from, to) => {
    if (to.startsWith('/')) return to;
    if (to.includes('://')) return to;
    return from.replace(/[^/]*$/, '') + to;
  },
  URL: _URL,
  URLSearchParams: _URLSearchParams,
};

// Export path
export const path = {
  join: pathJoin,
  dirname: pathDirname,
  basename: pathBasename,
  extname: pathExtname,
  resolve: pathResolve,
  normalize: pathNormalize,
  isAbsolute: p => p.startsWith('/'),
  relative: pathRelative,
  parse: pathParse,
  sep: '/',
  delimiter: ':',
};

// Export fs (GJS-native using GLib/Gio)
export const fs = {
  existsSync: p => GLib.file_test(p, GLib.FileTest.EXISTS),
  readFileSync: p => {
    const [ok, contents] = GLib.file_get_contents(p);
    if (!ok) throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    return new TextDecoder().decode(contents);
  },
  writeFileSync: (p, data) => {
    GLib.file_set_contents(p, new TextEncoder().encode(data));
  },
  mkdirSync: p => {
    GLib.mkdir_with_parents(p, 0o755);
  },
  statSync: p => ({
    isFile: () => GLib.file_test(p, GLib.FileTest.IS_REGULAR),
    isDirectory: () => GLib.file_test(p, GLib.FileTest.IS_DIR),
  }),
  readdirSync: () => [],
  unlinkSync: () => {},
  rmSync: () => {},
  rmdirSync: () => {},
  copyFileSync: () => {},
  renameSync: () => {},
  promises: {},
  constants: {},
  Stats: class Stats {
    isFile() { return true; }
    isDirectory() { return false; }
  },
};

// Default exports for mortero aliases
export default { util, url, path, fs };
