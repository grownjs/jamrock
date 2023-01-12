import { fs, path, glob, process, Buffer } from './deps.js';

import { Template } from '../../dist/main.mjs';
import { createTranspiler } from '../../dist/server.mjs';

Template.cache = new Map();
Template.transpile = createTranspiler({ createMortero: () => import('npm:mortero'), path });

/* global Deno */

Template.glob = x => glob.sync(x);
Template.read = x => Deno.readTextFileSync(x).toString();
Template.write = (f, x) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  Deno.writeTextFileSync(f, x);
};
Template.exists = x => fs.existsSync(x) && Deno.lstatSync(x).isFile;

Template.import = async (id, force) => {
  if (!force && Template.cache.has(id)) {
    return Template.cache.get(id).module;
  }
  if (force && id.charAt() === '/') {
    return import(`file://${id}?d=${Date.now()}`);
  }
  return import(id);
};

const global = globalThis;

Object.assign(globalThis, { global, process, Buffer });
