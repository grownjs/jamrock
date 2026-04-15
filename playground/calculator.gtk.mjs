import {
  createWindow, vstack, hstack, label, button, grid,
  signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const display = signal('0');
const previous = signal(null);
const operator = signal(null);
const waiting = signal(false);

function input(d) {
  if (waiting.value) {
    display.value = String(d);
    waiting.value = false;
  } else {
    display.value = display.value === '0' ? String(d) : display.value + d;
  }
}

function decimal() {
  if (waiting.value) {
    display.value = '0.';
    waiting.value = false;
  } else if (!display.value.includes('.')) {
    display.value = display.value + '.';
  }
}

function clear() {
  display.value = '0';
  previous.value = null;
  operator.value = null;
  waiting.value = false;
}

function op(nextOp) {
  const val = parseFloat(display.value);

  if (previous.value === null) {
    previous.value = val;
  } else if (operator.value) {
    const prev = previous.value;
    let result;

    if (operator.value === '+') result = prev + val;
    else if (operator.value === '-') result = prev - val;
    else if (operator.value === '*') result = prev * val;
    else if (operator.value === '/') result = val !== 0 ? prev / val : 'Error';

    display.value = String(result);
    previous.value = result;
  }

  waiting.value = true;
  operator.value = nextOp;
}

function calculate() {
  if (!operator.value || previous.value === null) return;

  const val = parseFloat(display.value);
  const prev = previous.value;
  let result;

  if (operator.value === '+') result = prev + val;
  else if (operator.value === '-') result = prev - val;
  else if (operator.value === '*') result = prev * val;
  else if (operator.value === '/') result = val !== 0 ? prev / val : 'Error';

  display.value = String(result);
  previous.value = null;
  operator.value = null;
  waiting.value = true;
}

const { open, close, win } = createWindow({ title: 'Calculator', width: 280, height: 350 });

attachDevTools(win, { signals: { display, previous, operator, waiting } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Calculator'),
  label(display.value),
  hstack([
    button('C', { onClick: clear }),
    button('÷', { onClick: () => op('/') }),
  ]),
  hstack([
    button('7', { onClick: () => input(7) }),
    button('8', { onClick: () => input(8) }),
    button('9', { onClick: () => input(9) }),
    button('×', { onClick: () => op('*') }),
  ]),
  hstack([
    button('4', { onClick: () => input(4) }),
    button('5', { onClick: () => input(5) }),
    button('6', { onClick: () => input(6) }),
    button('−', { onClick: () => op('-') }),
  ]),
  hstack([
    button('1', { onClick: () => input(1) }),
    button('2', { onClick: () => input(2) }),
    button('3', { onClick: () => input(3) }),
    button('+', { onClick: () => op('+') }),
  ]),
  hstack([
    button('0', { onClick: () => input(0) }),
    button('.', { onClick: decimal }),
    button('=', { onClick: calculate }),
  ]),
]));
