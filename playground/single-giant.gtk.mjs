import { createWindow, button, GLib } from '../dist/gtk.mjs';

print('START');

let count = 0;

const { open, close } = createWindow({ 
  title: 'Single Giant', 
  width: 1920,
  height: 1080,
  fullscreen: true,
});

GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
  print('TIMEOUT');
  close();
  return GLib.SOURCE_REMOVE;
});

open(() => button('CLICK ANYWHERE', { 
  onClick: () => {
    count++;
    print('CLICK:' + count);
  }
}));

print('OPENED');
