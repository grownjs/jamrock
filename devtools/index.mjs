/**
 * Jamrock DevTools — entry point
 *
 * Can be launched two ways:
 *   1. Via bin/gjs CLI:  bin/gjs devtools playground/button.gtk.mjs
 *   2. Via gjs directly: gjs -m devtools/index.mjs -- playground/button.gtk.mjs
 */

import { GLib } from '../dist/gtk.mjs';
import { DevToolsBridge } from './bridge.mjs';
import { AppRunner } from './runner.mjs';
import { createDevToolsWindow } from './ui/window.mjs';

/**
 * Launch DevTools for a given app path.
 * Called by bin/gtk-cli.mjs when `cmd === 'devtools'`.
 */
export async function launch(appPath) {
  if (!GLib.file_test(appPath, GLib.FileTest.EXISTS)) {
    throw new Error('File not found: ' + appPath);
  }

  const bridge = new DevToolsBridge();
  const runner = new AppRunner(appPath);

  bridge.start();

  runner.on('stdout', ({ line }) => print('[app] ' + line));
  runner.on('start', ({ path: p }) => print('[runner] Started: ' + p));
  runner.on('exit', ({ status }) => print('[runner] Exited: ' + status));
  runner.on('change', ({ file }) => print('[runner] Changed: ' + file + ' — reloading…'));
  runner.on('error', ({ message }) => print('[runner] Error: ' + message));

  const devtools = createDevToolsWindow(bridge, runner);

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
    runner.start();
    return GLib.SOURCE_REMOVE;
  });

  devtools.open();
}

// ─── Direct invocation via `gjs -m devtools/index.mjs -- app.gtk.mjs` ────────

// Only run when this file IS the gjs entry point, not when imported as a module.
// GJS sets programInvocationName to the -m path. Check it contains this file.
const _invocation = typeof imports !== 'undefined'
  ? imports.system?.programInvocationName ?? ''
  : '';

if (_invocation.includes('devtools/index.mjs')) {
  const args = (typeof ARGV !== 'undefined' ? ARGV : []).filter(a => a !== '--');
  const appArg = args[0];

  if (!appArg) {
    print('Usage: gjs -m devtools/index.mjs -- <app.gtk.mjs>');
    print('');
    print('Examples:');
    print('  gjs -m devtools/index.mjs -- playground/button.gtk.mjs');
    print('  gjs -m devtools/index.mjs -- playground/todo.gtk.mjs');
    imports.system.exit(1);
  }

  const appPath = GLib.canonicalize_filename(appArg, GLib.get_current_dir());

  print('Jamrock DevTools');
  print('Target: ' + appPath);
  print('');

  launch(appPath).catch(e => {
    print('Error: ' + e.message);
    imports.system.exit(1);
  });
}
