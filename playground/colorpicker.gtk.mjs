import {
  createWindow, vstack, hstack, label, button, range,
  signal, computed,
} from '../dist/gtk.mjs';

const red = signal(128);
const green = signal(64);
const blue = signal(192);
const alpha = signal(255);
const savedColors = signal([]);

function hexColor() {
  const r = red.value.toString(16).padStart(2, '0');
  const g = green.value.toString(16).padStart(2, '0');
  const b = blue.value.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function rgbaColor() {
  return `rgba(${red.value}, ${green.value}, ${blue.value}, ${(alpha.value / 255).toFixed(2)})`;
}

function saveColor() {
  const color = {
    name: `Color ${savedColors.value.length + 1}`,
    r: red.value,
    g: green.value,
    b: blue.value,
    a: alpha.value,
  };
  savedColors.value = [...savedColors.value, color];
}

function loadColor(color) {
  red.value = color.r;
  green.value = color.g;
  blue.value = color.b;
  alpha.value = color.a;
}

function clearColors() {
  savedColors.value = [];
}

const { open } = createWindow({ title: 'Color Picker', width: 350, height: 500 });

open(() => vstack([
  label('Color Picker'),
  label(`Red: ${red.value}`),
  range(red.value, { onChange: e => { red.value = Math.round(e.value); } }),
  label(`Green: ${green.value}`),
  range(green.value, { onChange: e => { green.value = Math.round(e.value); } }),
  label(`Blue: ${blue.value}`),
  range(blue.value, { onChange: e => { blue.value = Math.round(e.value); } }),
  label(`Alpha: ${alpha.value}`),
  range(alpha.value, { onChange: e => { alpha.value = Math.round(e.value); } }),
  label(`HEX: ${hexColor()}`),
  label(`RGBA: ${rgbaColor()}`),
  hstack([
    button('Save Color', { onClick: saveColor }),
    button('Clear All', { onClick: clearColors }),
  ]),
  label(`Saved Colors: ${savedColors.value.length}`),
  ...savedColors.value.map(color => hstack([
    button(color.name, { onClick: () => loadColor(color) }),
    label(`${color.r}, ${color.g}, ${color.b}`),
  ])),
]));
