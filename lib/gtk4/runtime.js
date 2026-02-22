import { fs, url, path, loadEnv, getCwd, globSync, getVersion, exitProgram, GLib } from './deps.js';
import { Soup } from './deps.js';

import { process, Util, Template } from '../../dist/main.mjs';

export * from './deps.js';

export const printError = (...args) => print(...args);
export const printLog = (...args) => print(...args);

// mimic node/deno/bun runtime is not a goal,
// we only mock as much as we can to make it work!

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
  *[Symbol.iterator]() {
    const keys = Object.keys(this.#values);

    for (const key of keys) {
      yield [key, this.get(key)];
    }
  }
}

class Request {
  constructor(url, opts = {}) {
    this.url = url;
    Object.assign(this, opts);
  }
}

class Headers extends _Iterator {}

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

class XMLHttpRequest {
  open() {}
  send() {}
  setRequestHeader() {}
}

// we emulate as much as we can,
// but full compat is not possible
export const console = {
  log: (...args) => print(args.join(' ')),
  error: (...args) => logError(new Error(args.join(' '))),
  warn: (...args) => print(`WARNING: ${args.join(' ')}`),
  info: (...args) => print(args.join(' ')),
};

async function _fetch(url, opts = {}) {
  const session = new Soup.Session();
  const method = opts.method || 'GET';
  const msg = new Soup.Message(method, url);
  
  if (opts.headers) {
    for (const [key, value] of Object.entries(opts.headers)) {
      msg.get_request_headers().append(key, value);
    }
  }
  
  if (opts.body) {
    msg.set_request_body_from_bytes('application/octet-stream', new TextEncoder().encode(opts.body));
  }
  
  return new Promise((resolve, reject) => {
    session.send_async(msg, GLib.PRIORITY_DEFAULT, null, (_s, res) => {
      try {
        const stream = session.send_finish(res);
        const bytes = stream.read_bytes(1024 * 1024, null);
        const body = new TextDecoder().decode(bytes.get_data());
        resolve(new Response(body, { status: msg.get_status() }));
      } catch (e) {
        reject(e);
      }
    });
  });
}

path.join = Template.join;
path.dirname = Template.dirname;
path.resolve = (...args) => GLib.canonicalize_filename(args.join('/'), null);
path.filename = Template.filename;

process.env = loadEnv();
// eslint-disable-next-line no-undef
process.argv = ['gjs', imports.system.programInvocationName].concat(ARGV);
process.cwd = getCwd;
process.exit = exitProgram;
process.version = `v${getVersion()}`;

process.shared = {
  fileURLToPath: url.fileURLToPath,
  writeFileSync: fs.writeFileSync,
  existsSync: fs.existsSync,
  readdirSync: fs.readdirSync,
  chmodSync: fs.chmodSync,
  cpSync: fs.cpSync,
  printError,
  printLog,
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
      const enc = new TextEncoder();
      const keyStr = enc.decode(key.keyData);
      const dataStr = enc.decode(data);
      const result = GLib.compute_hmac_for_string(GLib.ChecksumType.SHA1, keyStr, dataStr);
      return result;
    },
  },
};

Object.assign(globalThis, { process, console, fetch, Buffer, Headers, Response, Request, URLSearchParams, XMLHttpRequest, crypto });
