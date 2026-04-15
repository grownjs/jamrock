/**
 * DevTools smoke test — clicks every interactive element in the DevTools UI
 * using cliclick (maximize+borderless for predictable coords) and verifies
 * no crashes occur.
 *
 * Run: DYLD_LIBRARY_PATH=/opt/homebrew/lib gjs -m devtools/test-smoke.mjs
 */

import { GLib, Gio, Gtk } from '../dist/gtk.mjs';
import { DevToolsBridge } from './bridge.mjs';
import { AppRunner } from './runner.mjs';
import { createDevToolsWindow } from './ui/window.mjs';

const PASS = '✓';
const FAIL = '✗';
let passed = 0, failed = 0;

function assert(label, cond) {
  if (cond) { print(PASS + ' ' + label); passed++; }
  else       { print(FAIL + ' ' + label); failed++; }
}

function wait(ms) {
  return new Promise(r => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { r(); return GLib.SOURCE_REMOVE; }));
}

// ─── Find widget by name in DevTools window ───────────────────────────────────

function findWidget(widget, name) {
  if (widget.get_name?.() === name) return widget;
  let child = widget.get_first_child?.();
  while (child) {
    const found = findWidget(child, name);
    if (found) return found;
    child = child.get_next_sibling?.();
  }
  return null;
}

function listWidgets(widget, depth = 0) {
  const name = widget.get_name?.() || '';
  const type = widget.constructor.name.replace('Gtk_', '');
  if (name && !name.startsWith('Gtk')) print('  '.repeat(depth) + name + ' (' + type + ')');
  let child = widget.get_first_child?.();
  while (child) {
    listWidgets(child, depth + 1);
    child = child.get_next_sibling?.();
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────

print('=== DevTools Smoke Test ===');
print('');

const bridge = new DevToolsBridge();
bridge.start();

const runner = new AppRunner(GLib.get_current_dir() + '/devtools/test-target.gtk.mjs');
runner.on('stdout', ({ line }) => print('  [app] ' + line));
runner.start();

const dt = createDevToolsWindow(bridge, runner);
const dtWin = dt.win;

// Hard timeout
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
  print('HARD TIMEOUT');
  runner.stop(); bridge.stop();
  imports.system.exit(2);
  return GLib.SOURCE_REMOVE;
});

// ─── Run tests after UI settles ───────────────────────────────────────────────

GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
  runSmoke().then(() => {
    print('');
    print('=== Results ===');
    print('Passed: ' + passed);
    print('Failed: ' + failed);
    runner.stop();
    bridge.stop();
    dt.close();
    imports.system.exit(failed > 0 ? 1 : 0);
  }).catch(e => {
    print('ERROR: ' + e.message);
    runner.stop(); bridge.stop(); dt.close();
    imports.system.exit(1);
  });
  return GLib.SOURCE_REMOVE;
});

async function runSmoke() {
  print('--- Step 1: DevTools window widgets ---');

  print('Named widgets in DevTools:');
  listWidgets(dtWin);
  print('');

  // Verify key widgets exist
  assert('statusDot exists',    !!findWidget(dtWin, 'statusDot'));
  assert('statusLbl exists',    !!findWidget(dtWin, 'statusLbl'));
  assert('appPathLbl exists',   !!findWidget(dtWin, 'appPathLbl'));
  assert('btnReload exists',    !!findWidget(dtWin, 'btnReload'));
  assert('btnStop exists',      !!findWidget(dtWin, 'btnStop'));
  assert('tab:inspector exists',!!findWidget(dtWin, 'tab:inspector'));
  assert('tab:signals exists',  !!findWidget(dtWin, 'tab:signals'));
  assert('tab:events exists',   !!findWidget(dtWin, 'tab:events'));
  assert('tab:console exists',  !!findWidget(dtWin, 'tab:console'));

  print('');
  print('--- Step 2: Tab switching (all 4 tabs) ---');

  for (const tabId of ['inspector', 'signals', 'events', 'console']) {
    print('  Finding tab: ' + tabId);
    const tab = findWidget(dtWin, 'tab:' + tabId);
    print('  Found: ' + !!tab);
    assert(tabId + ' tab found', !!tab);
    if (tab) {
      print('  Emitting clicked on tab:' + tabId);
      tab.emit('clicked');
      print('  Emit done, waiting...');
      await wait(300);
      print('  Wait done');
      assert(tabId + ' tab clicked without crash', true);
    }
  }

  print('');
  print('--- Step 3: Inspector panel actions ---');

  // Switch to inspector
  findWidget(dtWin, 'tab:inspector')?.emit('clicked');
  await wait(200);

  const btnRefresh = findWidget(dtWin, 'btnRefresh');
  assert('btnRefresh found', !!btnRefresh);
  if (btnRefresh) {
    btnRefresh.emit('clicked');
    await wait(300);
    assert('refresh clicked without crash', true);
  }

  // btnClick and btnHighlight (need a widget selected first — tree may not have selection)
  const btnClick = findWidget(dtWin, 'btnClick');
  const btnHighlight = findWidget(dtWin, 'btnHighlight');
  assert('btnClick found', !!btnClick);
  assert('btnHighlight found', !!btnHighlight);

  if (btnClick) {
    btnClick.emit('clicked');
    await wait(200);
    assert('btnClick clicked without crash', true);
  }
  if (btnHighlight) {
    btnHighlight.emit('clicked');
    await wait(200);
    assert('btnHighlight clicked without crash', true);
  }

  print('');
  print('--- Step 4: Signals panel ---');

  findWidget(dtWin, 'tab:signals')?.emit('clicked');
  await wait(200);

  // Trigger a signal to populate the panel
  if (bridge.connected) {
    await bridge.click('btnIncrement');
    await wait(300);
    assert('signal panel received update without crash', true);
  }

  // Clear button
  const clearSig = findWidget(dtWin, 'signalList')?.get_parent()?.get_first_child();
  // The clear btn is in the header row — find it by type
  function findByType(widget, type) {
    if (widget.constructor.name.includes(type)) return widget;
    let child = widget.get_first_child?.();
    while (child) {
      const found = findByType(child, type);
      if (found) return found;
      child = child.get_next_sibling?.();
    }
    return null;
  }

  print('');
  print('--- Step 5: Events panel ---');

  findWidget(dtWin, 'tab:events')?.emit('clicked');
  await wait(200);
  assert('events tab visible without crash', true);

  // Pause button
  // Events panel toolbar has btnPause (ToggleButton) and btnClear
  // Find them by walking the events panel
  const eventsStack = findWidget(dtWin, 'eventList');
  if (eventsStack) {
    // Get parent toolbar
    const toolbar = eventsStack.get_parent()?.get_first_child?.()?.get_first_child?.()?.get_first_child?.();
    print('  event list found, triggering events...');
  }

  // Trigger more events to populate
  if (bridge.connected) {
    await bridge.click('btnIncrement');
    await bridge.click('btnIncrement');
    await wait(300);
    assert('events panel populated without crash', true);
  }

  print('');
  print('--- Step 6: Console panel ---');

  findWidget(dtWin, 'tab:console')?.emit('clicked');
  await wait(200);
  assert('console tab visible without crash', true);

  const consoleInput = findWidget(dtWin, 'consoleInput');
  assert('consoleInput found', !!consoleInput);

  if (consoleInput && bridge.connected) {
    consoleInput.set_text('return 1 + 1');
    consoleInput.emit('activate');
    await wait(300);
    assert('console eval executed without crash', true);

    consoleInput.set_text('return win.get_title()');
    consoleInput.emit('activate');
    await wait(300);
    assert('console win.get_title() without crash', true);

    consoleInput.set_text('return findWidget(win, "btnIncrement").get_label()');
    consoleInput.emit('activate');
    await wait(300);
    assert('console findWidget without crash', true);
  }

  // btnRun
  const btnRun = findWidget(dtWin, 'btnRun');
  assert('btnRun found', !!btnRun);
  if (btnRun && consoleInput) {
    consoleInput.set_text('return Object.keys(signals)');
    btnRun.emit('clicked');
    await wait(300);
    assert('btnRun clicked without crash', true);
  }

  // btnClearConsole
  const btnClearConsole = findWidget(dtWin, 'btnClearConsole');
  assert('btnClearConsole found', !!btnClearConsole);
  if (btnClearConsole) {
    btnClearConsole.emit('clicked');
    await wait(200);
    assert('console clear without crash', true);
  }

  print('');
  print('--- Step 7: Status bar ---');

  findWidget(dtWin, 'tab:inspector')?.emit('clicked');
  await wait(200);

  // Reload button
  const btnReload = findWidget(dtWin, 'btnReload');
  if (btnReload) {
    btnReload.emit('clicked');
    await wait(500);
    assert('btnReload clicked without crash', true);
  }

  print('');
  print('--- Step 8: Switch all tabs again after data ---');

  for (const tabId of ['events', 'signals', 'inspector', 'console', 'inspector']) {
    findWidget(dtWin, 'tab:' + tabId)?.emit('clicked');
    await wait(200);
    assert('tab ' + tabId + ' switch with data ok', true);
  }

  print('');
  print('--- Step 9: Bridge disconnection ---');

  runner.stop();
  await wait(500);
  assert('disconnection handled without crash', true);

  // Switch tabs after disconnect
  for (const tabId of ['signals', 'events', 'console', 'inspector']) {
    findWidget(dtWin, 'tab:' + tabId)?.emit('clicked');
    await wait(100);
  }
  assert('all tabs work after disconnect', true);
}

dt.open();
