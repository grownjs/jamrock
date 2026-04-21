import {
  createWindow, vstack, label, button,
  signal, GLib,
} from '../dist/gtk.mjs';

const clicks = signal(0);
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    print('  OK: ' + msg);
    passed++;
  } else {
    print('  FAIL: ' + msg);
    failed++;
  }
}

const { open, close, win } = createWindow({ title: 'Click Smoke Test', width: 300, height: 200 });

// Register timeout BEFORE open() blocks with main.run()
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
  const child = win.get_child();
  const btn = child.get_last_child();

  print('Button click simulation:');
  btn.emit('clicked');
  assert(clicks.value === 1, 'click increments to 1');

  btn.emit('clicked');
  assert(clicks.value === 2, 'click increments to 2');

  btn.emit('clicked');
  assert(clicks.value === 3, 'click increments to 3');

  print('\nResults: ' + passed + ' passed, ' + failed + ' failed');
  close();
  return GLib.SOURCE_REMOVE;
});

open(() => vstack([
  label(`Clicks: ${clicks.value}`),
  button('Click Me', { onClick: () => { clicks.value += 1; } }),
]));
