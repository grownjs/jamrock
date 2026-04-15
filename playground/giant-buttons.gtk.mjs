import { createWindow, vstack, hstack, label, button, GLib, Gtk } from '../dist/gtk.mjs';

print('START');

const clicks = { A: 0, B: 0, C: 0 };

const { open, close } = createWindow({ 
  title: 'Giant Buttons', 
  width: 1920,
  height: 1080,
  fullscreen: true,
});

const makeButton = (id) => {
  const btn = new Gtk.Button({ label: id });
  btn.set_hexpand(true);
  btn.set_vexpand(true);
  btn.connect('clicked', () => {
    clicks[id]++;
    print(`CLICK:${id}:${clicks[id]}`);
  });
  return btn;
};

GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 12, () => {
  print(`RESULTS: A=${clicks.A}, B=${clicks.B}, C=${clicks.C}`);
  print('TIMEOUT');
  close();
  return GLib.SOURCE_REMOVE;
});

// Giant buttons fill the screen
open(() => hstack([
  makeButton('A'),
  makeButton('B'),
  makeButton('C'),
]));

print('OPENED');
