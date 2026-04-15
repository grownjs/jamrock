import { createWindow, vstack, label, button, signal } from '../dist/gtk.mjs';

const clicks = signal(0);

const { open } = createWindow({ title: 'Button Demo', width: 300, height: 200 });

open(() => vstack([
  label(`Clicks: ${clicks.value}`),
  button('Click Me', { onClick: () => { clicks.value += 1; } }),
]));
