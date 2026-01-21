import * as fs from 'node:fs';
import * as url from 'node:url';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';

import glob from 'fast-glob';

import { ReadableStream } from 'node:stream/web';
import { fetch, Headers, Request, Response } from 'undici';

import { Template, process as _process } from '../../dist/main.mjs';
import { createTranspiler } from '../../dist/server.mjs';

_process.env = process.env;
_process.cwd = process.cwd;
_process.argv = process.argv;
_process.exit = process.exit;
_process.shared = {
  createRequire,
  printLog: console.log,
  printError: console.error,
  dirname: path.dirname,
  fileURLToPath: url.fileURLToPath,
  writeFileSync: fs.writeFileSync,
  existsSync: fs.existsSync,
  readdirSync: fs.readdirSync,
  chmodSync: fs.chmodSync,
  cpSync: fs.cpSync,
};

if (!('ReadableStream' in globalThis)) {
  Object.assign(globalThis, { fetch, Headers, Request, Response, ReadableStream });
}

const getESbuildModule = () => import('esbuild');

Template.cache = new Map();
Template.transpile = createTranspiler({ fs, Readable, getESbuildModule });

Template.glob = x => glob.sync(x);
Template.read = x => fs.readFileSync(x).toString();
Template.write = (f, x) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, x);
};
Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();

// web-containers issue
if (!globalThis.URL.parse) {
  globalThis.URL = url.URL;
  globalThis.URL.parse = url.parse;
}
