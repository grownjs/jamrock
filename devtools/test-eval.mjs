import { GLib, Gio } from '../dist/gtk.mjs';
import { DevToolsBridge } from './bridge.mjs';
import { AppRunner } from './runner.mjs';

print('=== Eval Bridge Test ===');
print('');

const bridge = new DevToolsBridge();
const runner = new AppRunner(GLib.get_current_dir() + '/devtools/test-target.gtk.mjs');

bridge.start();
runner.on('stdout', ({ line }) => print('  [app] ' + line));
runner.start();

let pass = 0, fail = 0;

function assert(label, cond) {
  if (cond) { print('✓ ' + label); pass++; }
  else { print('✗ ' + label); fail++; }
}

function wait(ms) {
  return new Promise(r => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { r(); return GLib.SOURCE_REMOVE; }));
}

bridge.on('connected', async () => {
  await wait(300);

  print('');
  print('--- eval: return value ---');
  let r = await bridge.eval('return 1 + 2');
  assert('eval 1+2 = 3', r?.ok && r.result === 3);

  r = await bridge.eval('return "hello"');
  assert('eval string', r?.ok && r.result === 'hello');

  r = await bridge.eval('return { x: 1, y: 2 }');
  assert('eval object', r?.ok && r.result?.x === 1);

  print('');
  print('--- eval: access win ---');
  r = await bridge.eval('return win ? win.constructor.name.includes("Window") : false');
  assert('win is accessible', r?.ok && r.result === true);

  print('');
  print('--- eval: findWidget ---');
  r = await bridge.eval('const w = findWidget(win, "btnIncrement"); return w ? w.get_name() : null');
  assert('findWidget works', r?.ok && r.result === 'btnIncrement');

  print('');
  print('--- eval: access signals ---');
  r = await bridge.eval('return typeof signals');
  assert('signals accessible', r?.ok && r.result === 'object');

  r = await bridge.eval('return Object.keys(signals).join(",")');
  assert('signals has count and text', r?.ok && r.result.includes('count'));

  print('');
  print('--- eval: error handling ---');
  r = await bridge.eval('throw new Error("test error")');
  assert('error caught', !r?.ok && r?.error?.includes('test error'));

  r = await bridge.eval('undefinedVariable.foo');
  assert('ref error caught', !r?.ok);

  print('');
  print('=== Results ===');
  print('Passed: ' + pass);
  print('Failed: ' + fail);

  runner.stop();
  bridge.stop();
  loop.quit();
});

GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 15, () => {
  print('TIMEOUT');
  runner.stop();
  bridge.stop();
  loop.quit();
  return GLib.SOURCE_REMOVE;
});

const loop = GLib.MainLoop.new(null, false);
loop.run();
imports.system.exit(fail > 0 ? 1 : 0);
