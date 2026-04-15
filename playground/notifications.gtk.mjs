import {
  createWindow, vstack, hstack, label, button, entry,
  signal,
} from '../dist/gtk.mjs';

const notifications = signal([]);
const notificationId = signal(0);
const notificationType = signal('info');
const notificationMessage = signal('');

const icons = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

function addNotification() {
  const id = notificationId.value + 1;
  notificationId.value = id;

  notifications.value = [...notifications.value, {
    id,
    type: notificationType.value,
    message: notificationMessage.value || `Notification ${id}`,
    icon: icons[notificationType.value] || 'ℹ️',
    timestamp: new Date().toLocaleTimeString(),
  }];

  notificationMessage.value = '';
}

function removeNotification(id) {
  notifications.value = notifications.value.filter(n => n.id !== id);
}

function clearAll() {
  notifications.value = [];
}

function setType(type) {
  notificationType.value = type;
}

const { open } = createWindow({ title: 'Notifications Demo', width: 400, height: 450 });

open(() => vstack([
  label('Notifications Demo'),
  label(`Active: ${notifications.value.length}`),
  label(`Type: ${notificationType.value}`),
  hstack([
    button('Info', { onClick: () => setType('info') }),
    button('Success', { onClick: () => setType('success') }),
    button('Warning', { onClick: () => setType('warning') }),
    button('Error', { onClick: () => setType('error') }),
  ]),
  entry('Message...', { onChange: e => { notificationMessage.value = e.value; } }),
  button('Add Notification', { onClick: addNotification }),
  label('Notifications:'),
  ...notifications.value.map(notif => hstack([
    label(notif.icon),
    label(notif.message),
    label(notif.timestamp),
    button('✕', { onClick: () => removeNotification(notif.id) }),
  ])),
  notifications.value.length === 0 ? label('No notifications') : null,
  button('Clear All', { onClick: clearAll }),
].filter(Boolean)));
