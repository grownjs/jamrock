import Mortero from 'npm:mortero';

import * as fs from 'https://deno.land/std/fs/mod.ts';
import * as path from 'https://deno.land/std/path/mod.ts';

import { Template } from '../../dist/main.mjs';
import { createTranspiler } from '../shared.mjs';

Template.cache = new Map();
Template.transpile = createTranspiler({ Mortero, path });

Template.glob = x => [...fs.expandGlobSync(x)].map(y => y.path);
Template.read = x => Deno.readTextFileSync(x).toString();
Template.write = (f, x) => Deno.writeTextFileSync(f, x);
Template.exists = x => fs.existsSync(x) && Deno.lstatSync(x).isFile;

const cache = new Map();

Template.import = async id => {
  if (id.includes('.cjs')) {
    let mod;
    if (cache.has(id)) {
      mod = cache.get(id);
    } else {
      mod = { exports: null };
      cache.set(id, mod);

      const cjs = await Deno.readTextFile(id);
      const [f] = Deno.core.evalContext(`(module => {${cjs}})`, id);
      f(mod);
    }
    return mod.exports;
  }
  return import(id);
};

/* global Deno */
globalThis.process = {
  exit: x => Deno.exit(x),
  cwd: () => Deno.cwd(),
  env: Deno.env.toObject(),
};
