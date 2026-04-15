/**
 * E2E CLI runner
 *
 * Usage:
 *   DYLD_LIBRARY_PATH=/opt/homebrew/lib gjs -m devtools/e2e/run.mjs -- <test-file.e2e.mjs> [target-app.gtk.mjs]
 *
 * If no target is specified, it's inferred from the test file name:
 *   test-target.e2e.mjs → devtools/test-target.gtk.mjs
 *
 * The target app MUST call attachDevTools(win) in its source.
 */

import { GLib, Gio } from '../../dist/gtk.mjs';
import { DevToolsBridge } from '../bridge.mjs';
import { AppRunner } from '../runner.mjs';
import { setBridge, runTests } from './runner.mjs';

// ─── Args ─────────────────────────────────────────────────────────────────────

const rawArgs = typeof ARGV !== 'undefined' ? ARGV.filter(a => a !== '--') : [];
const testFile = rawArgs[0];
let appFile = rawArgs[1];

if (!testFile) {
  print('Usage: gjs -m devtools/e2e/run.mjs -- <test.e2e.mjs> [app.gtk.mjs]');
  imports.system.exit(1);
}

const cwd = GLib.get_current_dir();
const testPath = GLib.canonicalize_filename(testFile, cwd);

if (!GLib.file_test(testPath, GLib.FileTest.EXISTS)) {
  print('Error: Test file not found: ' + testPath);
  imports.system.exit(1);
}

// Infer app from test file name if not specified
if (!appFile) {
  const base = testPath.split('/').pop().replace('.e2e.mjs', '.gtk.mjs');
  // Look in same dir, then devtools/, then playground/
  const candidates = [
    testPath.replace(/\/[^/]+$/, '/') + base,
    cwd + '/devtools/' + base,
    cwd + '/playground/' + base,
  ];
  appFile = candidates.find(p => GLib.file_test(p, GLib.FileTest.EXISTS));
}

if (!appFile) {
  print('Error: Could not find target app. Specify it as the second argument.');
  imports.system.exit(1);
}

const appPath = GLib.canonicalize_filename(appFile, cwd);
if (!GLib.file_test(appPath, GLib.FileTest.EXISTS)) {
  print('Error: App file not found: ' + appPath);
  imports.system.exit(1);
}

// ─── Bridge + Runner ─────────────────────────────────────────────────────────

print('=== Jamrock E2E ===');
print('Test: ' + testPath.replace(cwd + '/', ''));
print('App:  ' + appPath.replace(cwd + '/', ''));
print('');

const bridge = new DevToolsBridge();
const runner = new AppRunner(appPath);
let exitCode = 0;

bridge.start();
setBridge(bridge);

runner.on('stdout', ({ line }) => {
  if (line.startsWith('APP:') || line.startsWith('[app]')) print('  [app] ' + line);
});
runner.on('error', ({ message }) => {
  print('  [runner error] ' + message);
});

// ─── Wait for connection then run tests ───────────────────────────────────────

let connected = false;

bridge.on('connected', () => {
  if (connected) return;
  connected = true;

  // Give the app a moment to fully initialize, then run tests
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
    // Dynamically import test file to register tests, then run
    const testUrl = testPath.startsWith('file://') ? testPath : 'file://' + testPath;
    import(testUrl).then(async () => {
      print('Running tests…');
      print('');

      const { passed, failed, skipped } = await runTests();

      print('');
      print('─────────────────────────────');
      print('Passed:  ' + passed);
      if (failed > 0) print('Failed:  ' + failed);
      if (skipped > 0) print('Skipped: ' + skipped);
      print('Total:   ' + (passed + failed + skipped));
      print('');
      print(failed === 0 ? '✓ All tests passed' : '✗ ' + failed + ' test(s) failed');

      exitCode = failed > 0 ? 1 : 0;

      runner.stop();
      bridge.stop();
      loop.quit();
    }).catch(e => {
      print('Error loading test file: ' + e.message);
      runner.stop();
      bridge.stop();
      loop.quit();
    });

    return GLib.SOURCE_REMOVE;
  });
});

// ─── Fallback timeout ─────────────────────────────────────────────────────────

GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
  print('HARD TIMEOUT — no connection after 30s');
  runner.stop();
  bridge.stop();
  loop.quit();
  return GLib.SOURCE_REMOVE;
});

// ─── Start ────────────────────────────────────────────────────────────────────

runner.start();

const loop = GLib.MainLoop.new(null, false);
loop.run();

imports.system.exit(exitCode);
