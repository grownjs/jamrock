import {
  createWindow, vstack, hstack, label, button,
  signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const lastKey = signal('None');
const keyCount = signal(0);
const shortcuts = signal([
  { key: 'Ctrl+N', action: 'New File', count: 0 },
  { key: 'Ctrl+O', action: 'Open File', count: 0 },
  { key: 'Ctrl+S', action: 'Save File', count: 0 },
  { key: 'Ctrl+Z', action: 'Undo', count: 0 },
  { key: 'Ctrl+Y', action: 'Redo', count: 0 },
  { key: 'Ctrl+C', action: 'Copy', count: 0 },
  { key: 'Ctrl+V', action: 'Paste', count: 0 },
  { key: 'Ctrl+X', action: 'Cut', count: 0 },
]);

function triggerShortcut(index) {
  const shortcut = shortcuts.value[index];
  shortcuts.value = shortcuts.value.map((s, i) =>
    i === index ? { ...s, count: s.count + 1 } : s
  );
  lastKey.value = shortcut.key;
  keyCount.value += 1;
}

function resetCounts() {
  shortcuts.value = shortcuts.value.map(s => ({ ...s, count: 0 }));
  lastKey.value = 'None';
  keyCount.value = 0;
}

const { open, close, win } = createWindow({ title: 'Keyboard Shortcuts Demo', width: 350, height: 450 });

attachDevTools(win, { signals: { lastKey, keyCount, shortcuts } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Keyboard Shortcuts Demo'),
  label(`Last Action: ${lastKey.value}`),
  label(`Total Actions: ${keyCount.value}`),
  label('Shortcuts (click to simulate):'),
  ...shortcuts.value.map((shortcut, index) => hstack([
    label(shortcut.key),
    button(shortcut.action, { onClick: () => triggerShortcut(index) }),
    label(`Used: ${shortcut.count}x`),
  ])),
  button('Reset Counts', { onClick: resetCounts }),
]));
