import glob from 'fast-glob';
import * as fs from 'node:fs';
import * as url from 'node:url';
import * as path from 'node:path';
import { Template } from '../../dist/main.mjs';
import { createTranspiler } from '../../dist/server.mjs';

process.shared = {
  printLog: console.log,
  printError: console.error,
  fileURLToPath: url.fileURLToPath,
  writeFileSync: fs.writeFileSync,
  existsSync: fs.existsSync,
  readdirSync: fs.readdirSync,
  chmodSync: fs.chmodSync,
  cpSync: fs.cpSync,
};

Template.cache = new Map();
Template.transpile = createTranspiler({ fs });

Template.glob = x => glob.sync(x);
Template.read = x => fs.readFileSync(x).toString();
Template.write = (f, x) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, x);
};
Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();
Template.installAdapter();
