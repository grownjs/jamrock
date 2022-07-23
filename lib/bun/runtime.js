import Mortero from 'mortero';
import path from 'node:path';
import fs from 'node:fs';
import glob from 'glob';

import { Template } from '../../dist/main.mjs';
import { createTranspiler } from '../shared.mjs';

const cache = new Map();

Template.cache = new Map();
Template.transpile = createTranspiler({ Mortero, path });

Template.glob = x => glob.sync(x);
Template.read = x => fs.readFileSync(x).toString();
Template.write = (f, x) => fs.writeFileSync(f, x);
Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();

Template.import = async id => {
  if (id.includes('.cjs')) {
    let mod;
    if (cache.has(id)) {
      mod = cache.get(id);
    } else {
      mod = { module: {} };
      cache.set(id, mod);

      const code = Template.read(id);
      // eslint-disable-next-line no-new-func
      const fn = new Function('module', code);
      fn(mod);
    }
    return mod.exports;
  }
  return import(id);
};
