// @ts-nocheck
/* eslint-disable no-undef */
const GLib = imports.gi.GLib;

function loadEnv() {
  const env = {};
  const environ = GLib.get_environ();
  for (let i = 0; i < environ.length; i++) {
    const line = environ[i];
    const idx = line.indexOf('=');
    if (idx > 0) {
      env[line.slice(0, idx)] = line.slice(idx + 1);
    }
  }
  return env;
}

function getCwd() {
  return GLib.get_current_dir();
}

function getVersion() {
  return '22.0.0';
}

function exitProgram(code) {
  imports.system.exit(code || 0);
}

globalThis.process = {
  env: loadEnv(),
  argv: ['gjs', imports.system.programInvocationName].concat(ARGV),
  cwd: getCwd,
  exit: exitProgram,
  version: `v${getVersion()}`,
};

import('../lib/gtk4/runtime.js').then(() => Promise.all([
  import('../lib/gtk4/main.mjs'),
  import('./cli.mjs'),
]).then(([env, cli]) => cli.default(env.default, process.argv.slice(2), env.capabilities))).catch(logError);
