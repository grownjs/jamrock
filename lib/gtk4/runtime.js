// import { Readable } from 'node:stream';

import { fs, path, glob } from './deps.js';

import { Template } from '../../dist/main.mjs';
// import { createTranspiler } from '../../dist/server.mjs';

// const getESbuildModule = () => import('esbuild');

Template.cache = new Map();
// Template.transpile = createTranspiler({ fs, Readable, getESbuildModule });

Template.glob = x => glob.sync(x);
Template.read = x => fs.readFileSync(x).toString();
Template.write = (f, x) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, x);
};
Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();
