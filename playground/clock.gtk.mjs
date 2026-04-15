import {
  createWindow, vstack, hstack, label, button, range,
  signal, computed, GLib,
} from '../dist/gtk.mjs';

const time = signal(new Date());
const stopwatchRunning = signal(false);
const stopwatchTime = signal(0);
const laps = signal([]);

function formatTime(date) {
  return date.toLocaleTimeString();
}

function formatDate(date) {
  return date.toLocaleDateString();
}

function formatStopwatch(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function toggleStopwatch() {
  stopwatchRunning.value = !stopwatchRunning.value;
}

function resetStopwatch() {
  stopwatchRunning.value = false;
  stopwatchTime.value = 0;
  laps.value = [];
}

function addLap() {
  laps.value = [...laps.value, stopwatchTime.value];
}

const { open, close } = createWindow({ title: 'Clock & Timer', width: 300, height: 450 });

const timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
  time.value = new Date();
  if (stopwatchRunning.value) {
    stopwatchTime.value += 1;
  }
  return GLib.SOURCE_CONTINUE;
});

open(() => vstack([
  label('Clock & Timer'),
  label(formatTime(time.value)),
  label(formatDate(time.value)),
  label('Stopwatch'),
  label(formatStopwatch(stopwatchTime.value)),
  hstack([
    button(stopwatchRunning.value ? 'Pause' : 'Start', { onClick: toggleStopwatch }),
    button('Lap', { onClick: addLap }),
    button('Reset', { onClick: resetStopwatch }),
  ]),
  label(`Laps: ${laps.value.length}`),
  ...laps.value.map((lap, i) => label(`Lap ${i + 1}: ${formatStopwatch(lap)}`)),
]));
