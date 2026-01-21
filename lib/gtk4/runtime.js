// import { Readable } from 'xnode:stream';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';

// let credentials = new Gio.Credentials();
// let pid = credentials.get_unix_pid();

import { fs, url, path, glob } from './deps.js';

import { process, Template } from '../../dist/main.mjs';
// import { createTranspiler } from '../../dist/server.mjs';

process.env = {};
process.argv = [];
process.cwd = () => '/tmp/noop';
process.exit = exitCode => {
  if (Gtk.Window.get_default_root_window()) {
    Gtk.main_quit();
  }
  GLib.exit(exitCode);
};
process.shared = {
  createRequire: p => s => print('REQUIRE', p, s) || {},
  printError: (...args) => print('[ERR]', ...args),
  printLog: (...args) => print('[LOG]', ...args),
  dirname: path.dirname,
  fileURLToPath: url.fileURLToPath,
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
