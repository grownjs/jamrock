/**
 * Jamrock DevTools — entry point
 *
 * Usage:
 *   bin/gjs devtools playground/button.gtk.mjs
 *   DYLD_LIBRARY_PATH=/opt/homebrew/lib gjs -m devtools/index.mjs -- playground/button.gtk.mjs
 */

import { GLib } from '../dist/gtk.mjs';
import { DevToolsBridge } from './bridge.mjs';
import { AppRunner } from './runner.mjs';
import { createDevToolsWindow } from './ui/window.mjs';

// ─── CLI args ────────────────────────────────────────────────────────────────

// gjs passes `-- arg1 arg2` as ARGV = ['--', 'arg1', 'arg2']
const rawArgs = typeof ARGV !== 'undefined' ? ARGV : [];
const args = rawArgs.filter(a => a !== '--');
const appPath = args[0] ? GLib.canonicalize_filename(args[0], GLib.get_current_dir()) : null;

if (!appPath) {
  print('Usage: gjs -m devtools/index.mjs -- <app.gtk.mjs>');
  print('');
  print('Examples:');
  print('  gjs -m devtools/index.mjs -- playground/button.gtk.mjs');
  print('  gjs -m devtools/index.mjs -- playground/todo.gtk.mjs');
  imports.system.exit(1);
}

if (!GLib.file_test(appPath, GLib.FileTest.EXISTS)) {
  print('Error: File not found: ' + appPath);
  imports.system.exit(1);
}

print('Jamrock DevTools');
print('Target: ' + appPath);
print('');

// ─── Start bridge + runner ────────────────────────────────────────────────────

const bridge = new DevToolsBridge();
const runner = new AppRunner(appPath);

bridge.start();

// Log stdout from target to terminal
runner.on('stdout', ({ line }) => print('[app] ' + line));
runner.on('start', ({ path }) => print('[runner] Started: ' + path));
runner.on('exit', ({ status }) => print('[runner] Exited: ' + status));
runner.on('change', ({ file }) => print('[runner] Changed: ' + file + ' — reloading…'));
runner.on('error', ({ message }) => print('[runner] Error: ' + message));

// ─── Open DevTools window ────────────────────────────────────────────────────

const devtools = createDevToolsWindow(bridge, runner);

// Start runner after window is shown (needs GLib main loop running)
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
  runner.start();
  return GLib.SOURCE_REMOVE;
});

devtools.open();
