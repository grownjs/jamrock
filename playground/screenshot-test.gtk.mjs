import { createWindow, vstack, label, button, GLib } from '../dist/gtk.mjs';

print('START');

const { open, close } = createWindow({ 
  title: 'Screenshot Test', 
  width: 600,
  height: 400,
});

GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 15, () => {
  print('TIMEOUT');
  close();
  return GLib.SOURCE_REMOVE;
});

open(() => vstack([
  label('Screenshot Test'),
  label('Window should be visible'),
  button('CLICK ME', { 
    onClick: () => print('CLICK')
  }),
]));

print('OPENED');
