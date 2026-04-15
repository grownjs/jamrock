import {
  createWindow, vstack, hstack, label, button,
  signal, GLib,
} from '../dist/gtk.mjs';

const time = signal(0);
const running = signal(false);
const laps = signal([]);

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + '.' + String(centiseconds).padStart(2, '0');
}

let startTime = 0;
let timeoutId = 0;

function tick() {
  time.value = Date.now() - startTime;
  if (running.value) {
    timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, tick);
  }
  return GLib.SOURCE_REMOVE;
}

function start() {
  if (!running.value) {
    running.value = true;
    startTime = Date.now() - time.value;
    timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, tick);
  }
}

function stop() {
  if (running.value) {
    running.value = false;
    if (timeoutId) {
      GLib.source_remove(timeoutId);
    }
  }
}

function reset() {
  stop();
  time.value = 0;
  laps.value = [];
}

function lap() {
  if (running.value) {
    laps.value = [...laps.value, time.value];
  }
}

function toggle() {
  running.value ? stop() : start();
}

const { open } = createWindow({ title: 'Stopwatch', width: 300, height: 400 });

open(() => vstack([
  label('Stopwatch'),
  label(formatTime(time.value)),
  hstack([
    button(running.value ? 'Stop' : 'Start', { onClick: toggle }),
    button('Lap', { onClick: lap }),
    button('Reset', { onClick: reset }),
  ]),
  label(`Laps: ${laps.value.length}`),
  ...laps.value.map((lapTime, i) => label(`Lap ${i + 1}: ${formatTime(lapTime)}`)),
]));
