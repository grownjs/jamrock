import {
  createWindow, vstack, hstack, label, button, entry, toggle, progress, level, range,
  spinbutton, revealer, expander, calendar, spinner, separator, image, linkbutton,
  signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const count = signal(0);
const text = signal('');
const toggled = signal(false);
const progressVal = signal(0.5);
const levelVal = signal(0.7);
const rangeVal = signal(50);
const spinValue = signal(42);
const revealed = signal(true);
const expanded = signal(true);
const selectedDate = signal('No date selected');

const { open, close, win } = createWindow({ title: 'Widget Gallery', width: 350, height: 600 });

attachDevTools(win, { signals: { count, text, toggled, progressVal, levelVal, rangeVal, spinValue, revealed, expanded, selectedDate } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Widget Gallery'),
  label('Basic Widgets'),
  label(`Counter: ${count.value}`),
  hstack([
    button('-', { onClick: () => { count.value -= 1; } }),
    button('+', { onClick: () => { count.value += 1; } }),
  ]),
  label(`Text Input: ${text.value}`),
  entry('Type something...', { onChange: e => { text.value = e.value; } }),
  label(`Toggle: ${toggled.value ? 'ON' : 'OFF'}`),
  button(toggled.value ? 'ON' : 'OFF', { onClick: () => { toggled.value = !toggled.value; } }),
  label('Value Widgets'),
  label(`Progress: ${Math.round(progressVal.value * 100)}%`),
  progress(progressVal.value),
  label(`Level: ${Math.round(levelVal.value * 100)}%`),
  level(levelVal.value),
  label(`Range: ${rangeVal.value}`),
  range(rangeVal.value, { onChange: e => { rangeVal.value = e.value; } }),
  label(`SpinButton: ${spinValue.value}`),
  spinbutton({ value: spinValue.value, min: 0, max: 100, onChange: e => { spinValue.value = e.value; } }),
  label('Container Widgets'),
  label(`Revealer: ${revealed.value ? 'Visible' : 'Hidden'}`),
  button('Toggle Reveal', { onClick: () => { revealed.value = !revealed.value; } }),
  label(`Expander: ${expanded.value ? 'Expanded' : 'Collapsed'}`),
  button('Toggle Expand', { onClick: () => { expanded.value = !expanded.value; } }),
  label('Special Widgets'),
  label(`Calendar: ${selectedDate.value}`),
  calendar({ onChange: e => { selectedDate.value = e.value ? e.value.format('%Y-%m-%d') : 'No date'; } }),
  label('Spinner:'),
  spinner({}),
  separator({}),
  label('Image:'),
  image({ icon: 'dialog-information-symbolic' }),
  label('Link Button:'),
  linkbutton('Visit Jamrock', { uri: 'https://jamrock.site' }),
]));
