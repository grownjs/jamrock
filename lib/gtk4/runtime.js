/* eslint-disable no-undef, no-buffer-constructor, no-dupe-keys, class-methods-use-this, camelcase */
import { fs, url, path, loadEnv, getCwd, globSync, getVersion, exitProgram, GLib } from './deps.js';

import { Util, Template } from '../../dist/main.mjs';
import { fetch } from '../../dist/gtk.mjs';

export * from './deps.js';

export const printError = (...args) => print(...args);
export const printLog = (...args) => print(...args);

const _decoder = new TextDecoder('utf-8');
const _encoder = new TextEncoder();

class Buffer {
  #content;
  constructor(value) {
    this.#content = _encoder.encode(value);
  }
  toString(format) {
    if (format === 'base64') {
      return GLib.base64_encode(this.#content);
    }
    return _decoder.decode(this.#content);
  }
  static from(value) {
    return new Buffer(value);
  }
}

class _Iterator {
  #values = {};
  constructor(values) {
    Object.assign(this.#values, values);
  }
  get(key) {
    return this.#values[key];
  }
  set(key, value) {
    this.#values[key] = value;
  }
  append(key, value) {
    this.#values[key] = this.#values[key] || [];
    this.#values[key] = [...this.#values[key]].concat(value);
  }
  * [Symbol.iterator]() {
    const keys = Object.keys(this.#values);

    for (const key of keys) {
      yield [key, this.get(key)];
    }
  }
}

class Request {
  constructor(_url, opts = {}) {
    this.url = _url;
    Object.assign(this, opts);
  }
}

class Headers extends _Iterator { }

class Response {
  #body;
  get body() {
    return this.#body;
  }
  constructor(body, opts = {}) {
    const { status, headers, ...others } = opts;

    Object.assign(this, others);

    this.#body = body || '';
    this.status = status || 200;
    this.headers = { 'content-type': 'text/html' };

    if (headers) {
      Object.entries(headers).forEach(([k, v]) => {
        this.headers[k.toLowerCase()] = v;
      });
    }
  }
}
class URLSearchParams extends _Iterator {
  constructor(value) {
    super(GLib.Uri.parse_params(value, -1, '&', GLib.UriParamsFlags.NONE));
  }
}

export const console = {
  log: (...args) => print(args.join(' ')),
  error: (...args) => logError(new Error(args.join(' '))),
  warn: (...args) => print(`WARNING: ${args.join(' ')}`),
  info: (...args) => print(args.join(' ')),
};

path.join = Template.join;
path.dirname = Template.dirname;
path.resolve = (...args) => GLib.canonicalize_filename(args.join('/'), null);
path.filename = Template.filename;

export const process = {
  env: loadEnv(),
  argv: ['gjs', imports.system.programInvocationName].concat(ARGV),
  cwd: getCwd,
  exit: exitProgram,
  version: `v${getVersion()}`,
  shared: {
    fileURLToPath: url.fileURLToPath,
    writeFileSync: fs.writeFileSync,
    existsSync: fs.existsSync,
    readdirSync: fs.readdirSync,
    chmodSync: fs.chmodSync,
    cpSync: fs.cpSync,
    printError,
    printLog,
  },
};

Template.cache = new Map();

Template.glob = x => globSync(x, Util.glob2re);
Template.read = x => fs.readFileSync(x).toString();
Template.write = (f, x) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, x);
};
Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();

const crypto = {
  subtle: {
    async importKey(format, keyData, algorithm, extractable, keyUsages) {
      return { format, keyData: new TextEncoder().encode(keyData), algorithm, extractable, keyUsages };
    },
    async sign(algorithm, key, data) {
      const dec = new TextDecoder();
      const keyStr = dec.decode(key.keyData);
      const dataStr = dec.decode(data);
      const hexResult = GLib.compute_hmac_for_string(GLib.ChecksumType.SHA1, keyStr, dataStr, -1);
      const bytes = new Uint8Array(hexResult.length / 2);
      for (let i = 0; i < hexResult.length; i += 2) {
        bytes[i / 2] = parseInt(hexResult.substr(i, 2), 16);
      }
      return bytes.buffer;
    },
  },
};

function btoa(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return GLib.base64_encode(bytes);
}

function atob(b64) {
  const bytes = GLib.base64_decode(b64);
  return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
}

const nodeUtil = {
  inspect: obj => String(obj),
  format: (fmt, ...args) => fmt.replace(/%[sdj]/g, () => args.shift()),
  inherits: (ctor, superCtor) => {
    ctor.super_ = superCtor;
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
  },
  isDate: d => d instanceof Date,
  isError: e => e instanceof Error,
  isObject: o => o !== null && typeof o === 'object',
  isRegExp: r => r instanceof RegExp,
  isFunction: f => typeof f === 'function',
  isString: s => typeof s === 'string',
  isNumber: n => typeof n === 'number',
  isNullOrUndefined: v => v === null || v === undefined,
  isNull: v => v === null,
  isUndefined: v => v === undefined,
  isSymbol: s => typeof s === 'symbol',
  isPrimitive: v => v === null || (typeof v !== 'object' && typeof v !== 'function'),
  isBuffer: b => b instanceof Buffer,
  deprecate: fn => fn,
  promisify: fn => (...args) => new Promise((resolve, reject) => {
    fn(...args, (err, result) => (err ? reject(err) : resolve(result)));
  }),
  callbackify: fn => fn,
  types: {},
  TextEncoder,
  TextDecoder,
};

const nodeUrl = {
  parse: urlStr => {
    try {
      const uri = GLib.Uri.parse(urlStr, GLib.UriFlags.NONE);
      return {
        href: urlStr,
        protocol: uri.get_scheme(),
        host: uri.get_host(),
        hostname: uri.get_host(),
        port: uri.get_port(),
        pathname: uri.get_path(),
        search: uri.get_query(),
        hash: uri.get_fragment(),
      };
    } catch {
      return null;
    }
  },
  format: urlObj => {
    if (typeof urlObj === 'string') return urlObj;
    return urlObj.href || '';
  },
  resolve: (from, to) => {
    if (to.startsWith('/')) return to;
    if (to.includes('://')) return to;
    return from.replace(/[^/]*$/, '') + to;
  },
};

const nodePath = {
  join: Template.join,
  dirname: Template.dirname,
  basename: p => p.split('/').pop(),
  extname: p => {
    const base = p.split('/').pop();
    const idx = base.lastIndexOf('.');
    return idx > 0 ? base.slice(idx) : '';
  },
  resolve: (...args) => GLib.canonicalize_filename(args.join('/'), null),
  normalize: p => p.replace(/\/+/g, '/').replace(/\/\.$/, ''),
  isAbsolute: p => p.startsWith('/'),
  relative: (from, to) => {
    const fromParts = from.split('/').filter(Boolean);
    const toParts = to.split('/').filter(Boolean);
    let i = 0;
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
    const up = fromParts.length - i;
    return Array(up).fill('..').concat(toParts.slice(i)).join('/') || '.';
  },
  sep: '/',
  delimiter: ':',
  parse: p => {
    const base = p.split('/').pop();
    const ext = base.includes('.') ? `.${base.split('.').pop()}` : '';
    return {
      root: p.startsWith('/') ? '/' : '',
      dir: p.split('/').slice(0, -1).join('/') || '.',
      base,
      ext,
      name: ext ? base.slice(0, -ext.length) : base,
    };
  },
};

const nodeFs = {
  existsSync: fs.existsSync,
  readFileSync: fs.readFileSync,
  writeFileSync: fs.writeFileSync,
  mkdirSync: fs.mkdirSync,
  readdirSync: fs.readdirSync,
  statSync: fs.statSync,
  unlinkSync: fs.unlinkSync,
  rmSync: fs.rmSync,
  rmdirSync: fs.rmdirSync,
  copyFileSync: fs.copyFileSync,
  cpSync: fs.cpSync,
  chmodSync: fs.chmodSync,
  renameSync: fs.renameSync,
  readFileSync: fs.readFileSync,
  writeFileSync: fs.writeFileSync,
  promises: {},
  constants: {},
  Stats: class Stats {
    isFile() { return true; }
    isDirectory() { return false; }
  },
};

Object.assign(globalThis, {
  process,
  fetch,
  Buffer,
  Headers,
  Response,
  Request,
  URLSearchParams,
  crypto,
  btoa,
  atob,
});

import { registerModule } from './module-registry.js';

registerModule('util', nodeUtil);
registerModule('url', nodeUrl);
registerModule('path', nodePath);
registerModule('fs', nodeFs);
