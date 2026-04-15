# GTK Runtime API Design

## Module: `jamrock/gtk`

Exports all functions needed for GTK compilation target.

```typescript
// Core exports
export {
  // GObject integration
  GI, Gtk, Gdk, Gio, GLib, GObject,
  
  // State management
  signal, computed, effect, batch,
  
  // Widget DSL
  vstack, hstack, box,
  label, button, entry, toggle, check,
  spinner, image, progress, level,
  scroll, overlay, stack, paned, expander, revealer, frame,
  listview, dropdown, calendar,
  
  // GObject helpers
  defineClass, bindProperty,
  
  // Lifecycle
  onMount, onDestroy,
  
  // Context
  self, trackSignal,
  
  // Application
  createApplication,
} from 'jamrock/gtk';
```

---

## State Management

### `signal<T>(initialValue: T): Signal<T>`

```typescript
interface Signal<T> {
  get value(): T;
  set value(v: T);
  subscribe(callback: (value: T) => void): () => void;
  peek(): T;
}

const count = signal(0);
count.value = 1;
count.subscribe(v => console.log(v));
```

### `computed<T>(fn: () => T): Signal<T>`

```typescript
const doubled = computed(() => count.value * 2);
// Auto-updates when count changes
```

### `effect(fn: () => void | (() => void)): () => void`

```typescript
const dispose = effect(() => {
  console.log(`Count is ${count.value}`);
  return () => console.log('Cleanup');
});
dispose(); // Stop effect
```

---

## Widget DSL

### Containers

```typescript
// Vertical stack
vstack(children: GtkWidget[], props?: {
  spacing?: number;
  homogeneous?: boolean;
  name?: string;
  className?: string;
}): Gtk.Box

// Horizontal stack
hstack(children: GtkWidget[], props?: {...}): Gtk.Box

// Generic box
box(children: GtkWidget[], props?: {
  orientation?: Gtk.Orientation;
  spacing?: number;
}): Gtk.Box
```

### Inputs

```typescript
// Button
button(text: string, props?: {
  onClick?: (btn: Gtk.Button) => void;
  name?: string;
  className?: string;
  disabled?: boolean;
}): Gtk.Button

// Text entry
entry(placeholder: string, props?: {
  onChange?: (e: { type: string; value: string }) => void;
  name?: string;
  className?: string;
}): Gtk.Entry

// Toggle switch
toggle(props?: {
  active?: boolean;
  onToggle?: (active: boolean) => void;
  name?: string;
}): Gtk.Switch

// Checkbox
check(props?: {
  active?: boolean;
  onToggle?: (active: boolean) => void;
  label?: string;
}): Gtk.CheckButton
```

### Display

```typescript
// Label
label(text: string, props?: {
  name?: string;
  className?: string;
  wrap?: boolean;
  halign?: Gtk.Align;
}): Gtk.Label

// Progress bar
progress(props?: {
  fraction?: number;
  name?: string;
}): Gtk.ProgressBar

// Level bar
level(props?: {
  value?: number;
  inverted?: boolean;
}): Gtk.LevelBar

// Spinner
spinner(props?: {
  spinning?: boolean;
}): Gtk.Spinner

// Image
image(props?: {
  file?: string;
  icon_name?: string;
  pixel_size?: number;
}): Gtk.Image
```

### Layout

```typescript
// Scrollable container
scroll(child: GtkWidget, props?: {
  min?: number;
  max?: number;
}): Gtk.ScrolledWindow

// Overlay (stacked children)
overlay(children: GtkWidget[], props?: {}): Gtk.Overlay

// Stack (switchable pages)
stack(children: GtkWidget[], props?: {
  names?: string[];
}): Gtk.Stack

// Paned (resizable split)
paned(children: GtkWidget[], props?: {
  orientation?: Gtk.Orientation;
  position?: number;
}): Gtk.Paned

// Expander (collapsible)
expander(children: GtkWidget[], props?: {
  label?: string;
  expanded?: boolean;
}): Gtk.Expander

// Revealer (animated show/hide)
revealer(children: GtkWidget[], props?: {
  transition?: Gtk.RevealerTransitionType;
  reveal?: boolean;
}): Gtk.Revealer

// Frame (border + label)
frame(children: GtkWidget[], props?: {
  label?: string;
}): Gtk.Frame
```

### Lists

```typescript
// List view with factory pattern
listview(store: Gio.ListStore, props?: {
  // Widget factory (default: Gtk.Label)
  Factory?: typeof GtkWidget;
  
  // Bind callback - called when item becomes visible
  onBind?: (widget: GtkWidget, item: GObject.Object) => void;
  
  // Unbind callback - called when item scrolls out
  onUnbind?: (widget: GtkWidget, item: GObject.Object) => void;
  
  // Selection callback
  onSelect?: (item: GObject.Object) => void;
  
  // Enable tree expander
  nested?: boolean;
  
  name?: string;
}): Gtk.ListView

// Dropdown
dropdown(store: Gio.ListStore, props?: {
  onSelect?: (item: GObject.Object) => void;
  name?: string;
}): Gtk.DropDown
```

---

## GObject Helpers

### `defineClass(name, properties, Klass)`

```typescript
const ItemClass = defineClass('MyItem', {
  id: GObject.ParamSpec.int('id', 'ID', 'Item ID',
    GObject.ParamFlags.READWRITE, 0, Infinity, 0),
  name: GObject.ParamSpec.string('name', 'Name', 'Item name',
    GObject.ParamFlags.READWRITE, ''),
}, class extends GObject.Object {
  _id = 0;
  _name = '';
});

// Use with Gio.ListStore
const store = Gio.ListStore.new(ItemClass);
store.append(new ItemClass({ id: 1, name: 'Item' }));
```

### `bindProperty(signal, object, property)`

```typescript
const count = signal(0);
const lbl = label('0');

// Bind signal to widget property
bindProperty(count, lbl, 'label');
// lbl.label updates when count changes
```

---

## Lifecycle

### `onMount(callback: () => void | (() => void))`

```typescript
onMount(() => {
  console.log('Widget mounted');
  return () => console.log('Widget destroyed');
});
```

### `onDestroy(callback: () => void)`

```typescript
onDestroy(() => {
  // Cleanup resources
});
```

---

## Context

### `self: Record<string, GtkWidget>`

Global context for named widgets.

```typescript
// Create widget with name
const btn = button('Click', { name: 'submit_btn' });

// Access later
self.submit_btn.set_sensitive(false);
```

### `trackSignal(widget, signalId)`

Track signal handlers for automatic cleanup.

```typescript
const handlerId = widget.connect('clicked', onClick);
trackSignal(widget, handlerId);
// Automatically disconnected in onUnbind
```

---

## Application

### `createApplication(options, callback)`

```typescript
createApplication({
  application_id: 'org.example.App',
  title: 'My App',
  width: 800,
  height: 600,
  stylesheets: ['body { background: #fff; }'],
}, ({ self, window }) => {
  // Build UI
  const root = vstack([
    label('Hello'),
    button('Click', { onClick: () => {} })
  ]);
  
  window.set_child(root);
});
```

---

## Full Example

```typescript
import {
  createApplication,
  vstack, hstack, label, button, entry,
  listview, defineClass,
  signal, computed,
  self, trackSignal,
} from 'jamrock/gtk';
import { GObject, Gio } from 'gi://Gtk?version=4.0';

// Define list item class
const ItemClass = defineClass('TodoItem', {
  text: GObject.ParamSpec.string('text', 'Text', 'Item text',
    GObject.ParamFlags.READWRITE, ''),
  done: GObject.ParamSpec.boolean('done', 'Done', 'Is done',
    GObject.ParamFlags.READWRITE, false),
}, class extends GObject.Object {
  _text = '';
  _done = false;
});

createApplication({
  title: 'Todo App',
}, ({ window }) => {
  // State
  const todos = signal([
    { text: 'Learn GTK', done: false },
    { text: 'Build app', done: false },
  ]);
  const input = signal('');
  
  // List store
  const store = Gio.ListStore.new(ItemClass);
  todos.value.forEach(t => store.append(new ItemClass(t)));
  
  // UI
  const input_entry = entry('Add todo...', {
    onChange: (e) => input.value = e.value,
    name: 'input_entry',
  });
  
  const add_btn = button('Add', {
    onClick: () => {
      if (input.value) {
        todos.value = [...todos.value, { text: input.value, done: false }];
        input.value = '';
      }
    },
    name: 'add_btn',
  });
  
  const list = listview(store, {
    onBind: (widget, item) => {
      widget.set_label(item.text);
      if (item.done) widget.add_css_class('done');
    },
    onUnbind: (widget, item) => {
      widget.remove_css_class('done');
    },
  });
  
  // Reactivity
  todos.subscribe((newTodos) => {
    store.remove_all();
    newTodos.forEach(t => store.append(new ItemClass(t)));
  });
  
  // Build layout
  const root = vstack([
    hstack([input_entry, add_btn]),
    list,
  ]);
  
  window.set_child(root);
});
```
