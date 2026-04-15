import {
  createWindow, vstack, hstack, label, button, progress,
  signal, GLib,
} from '../dist/gtk.mjs';

const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

const mode = signal('work');
const timeLeft = signal(WORK_TIME);
const running = signal(false);
const sessions = signal(0);

let timeoutId = 0;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function getProgress() {
  const total = mode.value === 'work' ? WORK_TIME : BREAK_TIME;
  return (total - timeLeft.value) / total;
}

function tick() {
  if (timeLeft.value > 0) {
    timeLeft.value -= 1;
  } else {
    if (mode.value === 'work') {
      sessions.value += 1;
      mode.value = 'break';
      timeLeft.value = BREAK_TIME;
    } else {
      mode.value = 'work';
      timeLeft.value = WORK_TIME;
    }
  }
  if (running.value) {
    timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, tick);
  }
  return GLib.SOURCE_REMOVE;
}

function start() {
  if (!running.value) {
    running.value = true;
    timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, tick);
  }
}

function stop() {
  running.value = false;
  if (timeoutId) {
    GLib.source_remove(timeoutId);
  }
}

function reset() {
  stop();
  timeLeft.value = mode.value === 'work' ? WORK_TIME : BREAK_TIME;
}

function toggle() {
  running.value ? stop() : start();
}

function switchMode(newMode) {
  stop();
  mode.value = newMode;
  timeLeft.value = newMode === 'work' ? WORK_TIME : BREAK_TIME;
}

const { open } = createWindow({ title: 'Pomodoro Timer', width: 300, height: 350 });

open(() => vstack([
  label('Pomodoro Timer'),
  hstack([
    button('Work', { onClick: () => switchMode('work') }),
    button('Break', { onClick: () => switchMode('break') }),
  ]),
  label(mode.value === 'work' ? 'Work Time' : 'Break Time'),
  label(formatTime(timeLeft.value)),
  progress(getProgress()),
  hstack([
    button(running.value ? 'Pause' : 'Start', { onClick: toggle }),
    button('Reset', { onClick: reset }),
  ]),
  label(`Sessions completed: ${sessions.value}`),
]));
