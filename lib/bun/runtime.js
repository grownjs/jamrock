import glob from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { Template } from '../../dist/main.mjs';
import { createTranspiler } from '../../dist/server.mjs';

const getESbuildModule = () => import('esbuild');

Template.cache = new Map();
Template.transpile = createTranspiler({ fs, path, Readable, Template, getESbuildModule });

Template.glob = x => glob.sync(x);
Template.read = x => fs.readFileSync(x).toString();
Template.write = (f, x) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, x);
};
Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();
