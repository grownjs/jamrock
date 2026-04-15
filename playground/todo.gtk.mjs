import {
  createWindow, vstack, hstack, label, button, entry, range,
  signal, computed, GLib,
} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const todos = signal([]);
const input = signal('');

function addTodo() {
  const text = input.value.trim();
  if (text) {
    todos.value = [...todos.value, {
      id: Date.now(),
      text,
      done: false,
    }];
    input.value = '';
  }
}

function toggleTodo(id) {
  todos.value = todos.value.map(t =>
    t.id === id ? { ...t, done: !t.done } : t
  );
}

function removeTodo(id) {
  todos.value = todos.value.filter(t => t.id !== id);
}

const { open, close, win } = createWindow({ title: 'Todo App', width: 350, height: 400 });

attachDevTools(win, { signals: { todos, input } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Todo App'),
  hstack([
    entry('Add a todo...', { onChange: e => { input.value = e.value; } }),
    button('Add', { onClick: addTodo }),
  ]),
  label(`Todos: ${todos.value.length}`),
  ...todos.value.map(todo => hstack([
    button(todo.done ? '✓' : '○', { onClick: () => toggleTodo(todo.id) }),
    label(todo.text),
    button('✕', { onClick: () => removeTodo(todo.id) }),
  ])),
]));
