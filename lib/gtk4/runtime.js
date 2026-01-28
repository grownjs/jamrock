import { fs, url, path, loadEnv, getCwd, globSync, getVersion, exitProgram } from './deps.js';

import { process, Util, Template } from '../../dist/main.mjs';

export * from './deps.js';

export const printError = (...args) => print(...args);
export const printLog = (...args) => print(...args);

// jamrock for gtk4 is not meant for web-development,
// instead if should address desktop apps with some
// server/client support but just as extensions for
// the same app, not full-featured web stuff!

class Request {
  constructor(url, opts = {}) {
    this.url = url;
    Object.assign(this, opts);
  }
}
class Headers {}
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

// we emulate as much as we can,
// but full compat is not possible
function fetch() {
}

path.join = Template.join;
path.dirname = Template.dirname;
path.resolve = Template.relative;
path.filename = Template.filename;

process.env = loadEnv();
// eslint-disable-next-line no-undef
process.argv = ['gjs', imports.system.programInvocationName].concat(ARGV);
process.cwd = getCwd;
process.exit = exitProgram;
process.version = getVersion();

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

Object.assign(globalThis, { process, fetch, Headers, Response, Request });
