import {
  createWindow, vstack, hstack, label, button, range,
  signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const darkMode = signal(false);
const notifications = signal(true);
const autoSave = signal(true);
const soundEffects = signal(false);
const animations = signal(true);
const fontSize = signal(14);
const volume = signal(75);

const { open, close, win } = createWindow({ title: 'Settings', width: 350, height: 500 });

attachDevTools(win, { signals: { darkMode, notifications, autoSave, soundEffects, animations, fontSize, volume } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Settings'),
  label('Appearance'),
  hstack([
    label('Dark Mode'),
    button(darkMode.value ? 'ON' : 'OFF', { onClick: () => { darkMode.value = !darkMode.value; } }),
  ]),
  hstack([
    label('Animations'),
    button(animations.value ? 'ON' : 'OFF', { onClick: () => { animations.value = !animations.value; } }),
  ]),
  label(`Font Size: ${fontSize.value}px`),
  range(fontSize.value, { onChange: e => { fontSize.value = Math.round(e.value); } }),
  label('Notifications'),
  hstack([
    label('Enable Notifications'),
    button(notifications.value ? 'ON' : 'OFF', { onClick: () => { notifications.value = !notifications.value; } }),
  ]),
  hstack([
    label('Sound Effects'),
    button(soundEffects.value ? 'ON' : 'OFF', { onClick: () => { soundEffects.value = !soundEffects.value; } }),
  ]),
  label(`Volume: ${volume.value}%`),
  range(volume.value, { onChange: e => { volume.value = Math.round(e.value); } }),
  label('Data'),
  hstack([
    label('Auto Save'),
    button(autoSave.value ? 'ON' : 'OFF', { onClick: () => { autoSave.value = !autoSave.value; } }),
  ]),
  label('Current Settings:'),
  label(`Dark: ${darkMode.value ? 'Yes' : 'No'}`),
  label(`Notifications: ${notifications.value ? 'On' : 'Off'}`),
]));
