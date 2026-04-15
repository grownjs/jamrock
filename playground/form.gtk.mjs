import {
  createWindow, vstack, hstack, label, button, entry, range,
  signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const name = signal('');
const email = signal('');
const age = signal(25);
const bio = signal('');
const notifications = signal(true);
const theme = signal('dark');
const volume = signal(75);

function submitForm() {
  console.log('Form submitted:', {
    name: name.value,
    email: email.value,
    age: age.value,
    bio: bio.value,
    notifications: notifications.value,
    theme: theme.value,
    volume: volume.value,
  });
}

function resetForm() {
  name.value = '';
  email.value = '';
  age.value = 25;
  bio.value = '';
  notifications.value = true;
  theme.value = 'dark';
  volume.value = 75;
}

const { open, close, win } = createWindow({ title: 'Form Demo', width: 350, height: 500 });

attachDevTools(win, { signals: { name, email, age, bio, notifications, theme, volume } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Form Demo'),
  label(`Name: ${name.value || '(not set)'}`),
  entry('Enter your name', { onChange: e => { name.value = e.value; } }),
  label(`Email: ${email.value || '(not set)'}`),
  entry('Enter your email', { onChange: e => { email.value = e.value; } }),
  label(`Age: ${age.value}`),
  range(age.value, { onChange: e => { age.value = parseInt(e.value, 10); } }),
  label(`Bio: ${bio.value || '(not set)'}`),
  entry('Tell us about yourself', { onChange: e => { bio.value = e.value; } }),
  label(`Notifications: ${notifications.value ? 'ON' : 'OFF'}`),
  button(notifications.value ? 'Disable' : 'Enable', { onClick: () => { notifications.value = !notifications.value; } }),
  label(`Theme: ${theme.value}`),
  hstack([
    button('Light', { onClick: () => { theme.value = 'light'; } }),
    button('Dark', { onClick: () => { theme.value = 'dark'; } }),
    button('System', { onClick: () => { theme.value = 'system'; } }),
  ]),
  label(`Volume: ${volume.value}%`),
  range(volume.value, { onChange: e => { volume.value = parseInt(e.value, 10); } }),
  hstack([
    button('Submit', { onClick: submitForm }),
    button('Reset', { onClick: resetForm }),
  ]),
]));
