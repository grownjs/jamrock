/**
 * Bridge programmatic test — no mouse, no cliclick.
 * Verifies IPC, widget tree, signal tracking, commands.
 * Run: DYLD_LIBRARY_PATH=/opt/homebrew/lib gjs -m devtools/test-bridge.mjs
 */
import { GLib, Gio } from '../dist/gtk.mjs';
import { DevToolsBridge } from './bridge.mjs';

const PASS = '✓';
const FAIL = '✗';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    print(PASS + ' ' + label);
    passed++;
  } else {
    print(FAIL + ' ' + label);
    failed++;
  }
}

// ─── Start Bridge Server ─────────────────────────────────────────────────────

print('=== DevTools Bridge Test ===');
print('');

const bridge = new DevToolsBridge();
bridge.start();

// ─── Track state ─────────────────────────────────────────────────────────────

let connected = false;
let lastTree = null;
const signals = {};
const events = [];

bridge.on('connected', () => {
  connected = true;
  print('[bridge] target connected');
});

bridge.on('disconnected', () => {
  connected = false;
});

bridge.on('tree', msg => {
  lastTree = msg.tree;
});

bridge.on('signal', msg => {
  signals[msg.name] = { value: msg.value, prev: msg.prev };
});

bridge.on('event', msg => {
  events.push(msg);
});

// ─── Spawn Target ─────────────────────────────────────────────────────────────

const cwd = GLib.get_current_dir();
const targetPath = cwd + '/devtools/test-target.gtk.mjs';

const env = [
  ...GLib.get_environ().filter(e => !e.startsWith('DYLD_LIBRARY_PATH=')),
  'DYLD_LIBRARY_PATH=/opt/homebrew/lib',
  'JAMROCK_DEVTOOLS=1',
];

print('Spawning target: ' + targetPath);

const launcher = new Gio.SubprocessLauncher({
  flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE,
});
launcher.setenv('DYLD_LIBRARY_PATH', '/opt/homebrew/lib', true);
launcher.setenv('JAMROCK_DEVTOOLS', '1', true);
const proc = launcher.spawnv(['gjs', '-m', targetPath]);

// Pipe target stdout to our stdout
const targetOut = new Gio.DataInputStream({ base_stream: proc.get_stdout_pipe() });
function readTargetOutput() {
  targetOut.read_line_async(GLib.PRIORITY_DEFAULT, null, (s, res) => {
    try {
      const [line] = s.read_line_finish_utf8(res);
      if (line !== null) {
        print('  [target] ' + line);
        readTargetOutput();
      }
    } catch { /* done */ }
  });
}
readTargetOutput();

// ─── Test sequence ────────────────────────────────────────────────────────────

function wait(ms) {
  return new Promise(resolve => {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; });
  });
}

async function runTests() {
  // Wait for connection
  await wait(2000);

  print('');
  print('--- Test 1: Connection ---');
  assert('bridge connected to target', connected);
  assert('received initial tree', lastTree !== null);

  print('');
  print('--- Test 2: Widget Tree ---');
  assert('root is ApplicationWindow', lastTree?.type === 'ApplicationWindow');
  
  // Walk tree to find named widgets
  function findInTree(node, name) {
    if (!node) return null;
    if (node.name === name) return node;
    for (const child of node.children ?? []) {
      const found = findInTree(child, name);
      if (found) return found;
    }
    return null;
  }

  const btnNode = findInTree(lastTree, 'btnIncrement');
  const lblNode = findInTree(lastTree, 'counterLabel');
  const entryNode = findInTree(lastTree, 'textEntry');

  assert('btnIncrement found in tree', btnNode !== null);
  assert('btnIncrement type is Button', btnNode?.type === 'Button');
  assert('counterLabel found in tree', lblNode !== null);
  assert('textEntry found in tree', entryNode !== null);
  assert('btnIncrement has position', btnNode?.x !== null && btnNode?.y !== null);

  print('');
  print('--- Test 3: Commands — click ---');
  const clickResult = await bridge.click('btnIncrement');
  assert('click command ok', clickResult?.ok === true);

  await wait(300);
  assert('signal count received after click', signals['count'] !== undefined);
  assert('count value is 1 after click', signals['count']?.value === 1);

  // Click again
  await bridge.click('btnIncrement');
  await wait(300);
  assert('count value is 2 after 2nd click', signals['count']?.value === 2);

  print('');
  print('--- Test 4: Commands — set_text ---');
  const textResult = await bridge.setText('textEntry', 'devtools works!');
  assert('set_text command ok', textResult?.ok === true);

  print('');
  print('--- Test 5: Commands — snapshot ---');
  const snap = await bridge.snapshot();
  assert('snapshot ok', snap?.ok === true);
  assert('snapshot has tree', snap?.tree !== null);
  assert('snapshot root is ApplicationWindow', snap?.tree?.type === 'ApplicationWindow');

  print('');
  print('--- Test 6: Signal tracking ---');
  const setSignalResult = await bridge.setSignal('count', 42);
  assert('set_signal command ok', setSignalResult?.ok === true);
  await wait(300);
  assert('signal count updated to 42', signals['count']?.value === 42);

  print('');
  print('--- Test 7: Event tracking ---');
  await bridge.click('btnIncrement');
  await wait(300);
  const clickEvents = events.filter(e => e.kind === 'clicked' && e.widget === 'btnIncrement');
  assert('click event received', clickEvents.length > 0);

  print('');
  print('--- Test 8: Highlight command ---');
  const hlResult = await bridge.highlight('btnIncrement', 500);
  assert('highlight command ok', hlResult?.ok === true);

  print('');
  print('--- Test 9: Tree updates on click ---');
  const treeBefore = lastTree;
  await bridge.click('btnIncrement');
  await wait(300);
  assert('tree refreshed after command', lastTree !== treeBefore);

  print('');
  print('=== Results ===');
  print('Passed: ' + passed);
  print('Failed: ' + failed);
  print('Total:  ' + (passed + failed));
}

runTests().then(() => {
  // Cleanup
  try { proc.send_signal(15); } catch { /* ignore */ }
  bridge.stop();
  imports.system.exit(failed > 0 ? 1 : 0);
}).catch(e => {
  print('ERROR: ' + e.message);
  try { proc.send_signal(15); } catch { /* ignore */ }
  bridge.stop();
  imports.system.exit(1);
});

// Fallback: hard exit after 20s no matter what
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 20, () => {
  print('HARD TIMEOUT — forcing exit');
  try { proc.send_signal(15); } catch { /* ignore */ }
  imports.system.exit(2);
  return GLib.SOURCE_REMOVE;
});

const loop = GLib.MainLoop.new(null, false);
loop.run();
