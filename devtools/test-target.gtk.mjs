/**
 * Bridge test target — minimal app with bridge-agent attached.
 * Auto-exits after 10s as fallback.
 */
import { createWindow, vstack, GLib, Gtk } from '../dist/gtk.mjs';
import { attachDevTools } from './bridge-agent.mjs';
import { signal } from '../dist/gtk.mjs';

print('APP:START');

const count = signal(0);
const text = signal('hello');

const { open, close, win } = createWindow({
  title: 'Bridge Test Target',
  width: 400,
  height: 300,
});

// Fallback exit
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
  print('APP:TIMEOUT');
  close();
  return GLib.SOURCE_REMOVE;
});

// Attach devtools BEFORE open() — bridge connects during the main loop
attachDevTools(win, { signals: { count, text } });
print('APP:READY');

open(() => {
  const btn = new Gtk.Button({ label: 'Increment' });
  btn.set_name('btnIncrement');
  btn.set_hexpand(true);
  btn.connect('clicked', () => {
    count.value++;
    print('APP:CLICK count=' + count.value);
  });

  const lbl = new Gtk.Label({ label: 'Counter: 0' });
  lbl.set_name('counterLabel');

  const entry = new Gtk.Entry({ placeholder_text: 'type here' });
  entry.set_name('textEntry');
  entry.connect('activate', () => {
    text.value = entry.get_text();
    print('APP:ENTRY text=' + text.value);
  });

  return vstack([lbl, btn, entry]);
});
