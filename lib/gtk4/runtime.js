import { fs, url, path, loadEnv, getCwd, globSync, getVersion, exitProgram } from './deps.js';

import { process, Util, Template } from '../../dist/main.mjs';

export * from './deps.js';

export const printError = (...args) => print(...args);
export const printLog = (...args) => print(...args);

path.join = Template.join;
path.dirname = Template.dirname;
path.resolve = Template.relative;
path.filename = Template.filename;

process.env = loadEnv();
// eslint-disable-next-line no-undef
process.argv = ['gjs', imports.system.programInvocationName].concat(ARGV);
process.cwd = getCwd;
process.exit = exitProgram;
process.version = getVersion();

process.shared = {
  fileURLToPath: url.fileURLToPath,
  writeFileSync: fs.writeFileSync,
  existsSync: fs.existsSync,
  readdirSync: fs.readdirSync,
  chmodSync: fs.chmodSync,
  cpSync: fs.cpSync,
  printError,
  printLog,
};

Template.cache = new Map();

Template.glob = x => globSync(x, Util.glob2re);
Template.read = x => fs.readFileSync(x).toString();
Template.write = (f, x) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, x);
};
Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();

Object.assign(globalThis, { process });
