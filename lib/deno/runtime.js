import { fs, path, glob, process, Buffer, Readable, getESbuildModule } from './deps.js';

import { Template } from '../../dist/main.mjs';
import { createTranspiler } from '../../dist/server.mjs';

Template.cache = new Map();
Template.transpile = createTranspiler({ fs, Readable, getESbuildModule });

/* global Deno */

Template.glob = x => glob.sync(x);
Template.read = x => Deno.readTextFileSync(x).toString();
Template.write = (f, x) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  Deno.writeTextFileSync(f, x);
};
Template.exists = x => fs.existsSync(x) && Deno.lstatSync(x).isFile;

Object.assign(globalThis, { process, Buffer });
