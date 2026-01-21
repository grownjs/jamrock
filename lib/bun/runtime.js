import glob from 'fast-glob';
import * as fs from 'node:fs';
import * as url from 'node:url';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { Template, process as _process } from '../../dist/main.mjs';
import { createTranspiler } from '../../dist/server.mjs';

_process.env = process.env;
_process.cwd = process.cwd;
_process.argv = process.argv;
_process.exit = process.exit;
_process.version = process.version;
_process.shared = {
  printLog: console.log,
  printError: console.error,
  fileURLToPath: url.fileURLToPath,
  writeFileSync: fs.writeFileSync,
  existsSync: fs.existsSync,
  readdirSync: fs.readdirSync,
  chmodSync: fs.chmodSync,
  cpSync: fs.cpSync,
};

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
