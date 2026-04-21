import {
  signal, computed,
  createTestWindow, findButtons, clickButton,
  vstack, label, button,
  GLib,
} from '../dist/gtk.mjs';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    print('  OK: ' + msg);
    passed++;
  } else {
    print('  FAIL: ' + msg);
    failed++;
  }
}

// --- signal basics ---
print('\nSignal basics:');
const count = signal(0);
assert(count.value === 0, 'initial value');
count.value = 5;
assert(count.value === 5, 'set value');
count.value++;
assert(count.value === 6, 'increment');

// --- computed ---
print('\nComputed:');
const doubled = computed(() => count.value * 2);
assert(doubled.value === 12, 'computed from signal');
count.value = 3;
assert(doubled.value === 6, 'computed updates');

// --- computed with conditionals (if/else-if/else) ---
print('\nComputed conditionals:');
const statusLabel = computed(() => {
  if (count.value === 0) return 'zero';
  if (count.value === 1) return 'one';
  return 'many';
});
count.value = 0;
assert(statusLabel.value === 'zero', 'if branch');
count.value = 1;
assert(statusLabel.value === 'one', 'else-if branch');
count.value = 7;
assert(statusLabel.value === 'many', 'else branch');

// --- toggle signal (if/else pattern) ---
print('\nToggle (if/else):');
const isOpen = signal(false);
function toggle() { isOpen.value = !isOpen.value; }
assert(isOpen.value === false, 'initially false');
toggle();
assert(isOpen.value === true, 'after toggle');
toggle();
assert(isOpen.value === false, 'after second toggle');

// --- array signal (each pattern) ---
print('\nArray signal (each):');
const items = signal(['a', 'b', 'c']);
assert(items.value.length === 3, 'initial length');
assert(items.value[0] === 'a', 'first item');

items.value = [...items.value, 'd'];
assert(items.value.length === 4, 'after push');
assert(items.value[3] === 'd', 'pushed item');

items.value = items.value.slice(0, -1);
assert(items.value.length === 3, 'after pop');

items.value = items.value.filter((_, i) => i !== 1);
assert(items.value.length === 2, 'after remove');
assert(items.value[1] === 'c', 'remaining items');

items.value = items.value.map((v, i) => i === 0 ? 'x' : v);
assert(items.value[0] === 'x', 'after replace');

items.value = [];
assert(items.value.length === 0, 'after clear');

// --- object array signal (todo-like) ---
print('\nObject array signal:');
const todos = signal([]);
function addTodo(text) {
  todos.value = [...todos.value, { id: todos.value.length + 1, text, done: false }];
}
function toggleTodo(id) {
  todos.value = todos.value.map(t => t.id === id ? { ...t, done: !t.done } : t);
}
function removeTodo(id) {
  todos.value = todos.value.filter(t => t.id !== id);
}

assert(todos.value.length === 0, 'empty todos');
addTodo('Buy milk');
addTodo('Write code');
assert(todos.value.length === 2, 'after adding 2');
assert(todos.value[0].text === 'Buy milk', 'first todo text');
assert(todos.value[0].done === false, 'first todo not done');

toggleTodo(1);
assert(todos.value[0].done === true, 'after toggle');
toggleTodo(1);
assert(todos.value[0].done === false, 'after second toggle');

removeTodo(1);
assert(todos.value.length === 1, 'after remove');
assert(todos.value[0].text === 'Write code', 'remaining todo');

// --- computed from array signal ---
print('\nComputed from array:');
const doneCount = computed(() => todos.value.filter(t => t.done).length);
assert(doneCount.value === 0, 'no done items');
toggleTodo(2);
assert(doneCount.value === 1, 'one done item');

// --- GTK widget click simulation via createTestWindow ---
print('\nGTK click simulation:');
const clicks = signal(0);

const { open, close, win, scheduleTest } = createTestWindow({ title: 'Smoke Test' });

scheduleTest((w, h) => {
  const found = clickButton(w, 'Click Me');
  assert(found && clicks.value === 1, 'first click');

  clickButton(w, 'Click Me');
  assert(clicks.value === 2, 'second click');

  clickButton(w, 'Click Me');
  assert(clicks.value === 3, 'third click');
});

open(() => vstack([
  label(`Clicks: ${clicks.value}`),
  button('Click Me', { onClick: () => { clicks.value += 1; } }),
]));
