import * as fs from 'node:fs';
import * as path from 'node:path';
import buffer from 'node:buffer';
import glob from 'fast-glob';

import { ReadableStream } from 'node:stream/web';
import { File as UndiciFile, fetch, Headers, Request, Response } from 'undici';

import { Template } from '../../dist/main.mjs';
import { createTranspiler } from '../../dist/server.mjs';

if (!('ReadableStream' in globalThis)) {
  Object.assign(globalThis, { fetch, Headers, Request, Response, ReadableStream });
}

Template.cache = new Map();
Template.transpile = createTranspiler({ createMortero: () => import('mortero'), path });

Template.glob = x => glob.sync(x);
Template.read = x => fs.readFileSync(x).toString();
Template.write = (f, x) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, x);
};
Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();

Template.import = (id, force) => {
  if (!force && Template.cache.has(id)) {
    return Template.cache.get(id).module;
  }
  if (force && id.charAt() === '/') {
    return import(`file://${id}?d=${Date.now()}`);
  }
  return import(id);
};

const File = buffer.File || UndiciFile;

if (!('File' in globalThis)) {
  Object.defineProperty(globalThis, 'File', {
    enumerable: true,
    configurable: true,
    writable: true,
    value: File,
  });
}
