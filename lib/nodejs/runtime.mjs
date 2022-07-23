import glob from 'glob';
import path from 'path';
import fs from 'fs-extra';
import Mortero from 'mortero';
import { runInNewContext } from 'vm';

import { Template } from '../../dist/main.mjs';
import { createTranspiler } from '../shared.mjs';

Template.eval = code => {
  const _ = {};
  runInNewContext(`result = ${code}`, _);
  return _.result;
};

Template.cache = new Map();
Template.transpile = createTranspiler({ Mortero, path });

Template.glob = x => glob.sync(x);
Template.read = x => fs.readFileSync(x).toString();
Template.write = (f, x) => fs.outputFileSync(f, x);
Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();
