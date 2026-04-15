import { createWindow, vstack, label, button, signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const clicks = signal(0);

const { open, close, win } = createWindow({ title: 'Button Demo', width: 300, height: 200 });

attachDevTools(win, { signals: { clicks } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label(`Clicks: ${clicks.value}`),
  button('Click Me', { onClick: () => { clicks.value += 1; } }),
]));
