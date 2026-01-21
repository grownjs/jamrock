// import { Readable } from 'node:stream';

import { fs, path, glob, loadEnv, getCwd, getVersion, exitProgram } from './deps.js';

import { process, Template } from '../../dist/main.mjs';
// import { createTranspiler } from '../../dist/server.mjs';

path.dirname = Template.dirname;
path.resolve = Template.relative;
path.filename = Template.filename;

process.env = loadEnv();
process.argv = ['gjs', imports.system.programInvocationName].concat(ARGV);
process.cwd = getCwd;
process.exit = exitProgram;
process.version = getVersion();

process.shared = {
  printError: (...args) => print(...args),
  printLog: (...args) => print(...args),
  writeFileSync: fs.writeFileSync,
  existsSync: fs.existsSync,
  readdirSync: fs.readdirSync,
  chmodSync: fs.chmodSync,
  cpSync: fs.cpSync,
};

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

Object.assign(globalThis, { process });
