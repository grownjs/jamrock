# GTK Compilation Target - Complete Design

## 1. Reactivity Model

### Hybrid Approach: Signals + GObject Properties

```javascript
// Component state: Use signals (familiar API)
const clicks = signal(0);
const items = signal([...]);

// List items: Use GObject properties (required for Gio.ListStore)
const ItemClass = defineClass('Item', {
  name: GObject.ParamSpec.string('name', ...),
  price: GObject.ParamSpec.double('price', ...),
}, class extends GObject.Object { ... });
```

**Why hybrid?**
- Signals: Familiar API, works with existing Jamrock code
- GObject: Required for `Gio.ListStore`, property bindings

### Signal-to-Widget Binding

```javascript
// Generated code subscribes to signals
const clicks = signal(0);

const lbl = label(`Clicks: ${clicks.value}`);

// Auto-generated subscription
clicks.subscribe((value) => {
  lbl.set_label(`Clicks: ${value}`);
});
```

### Signal-to-GObject Binding

```javascript
// For list items, use GObject property bindings
const item = new ItemClass({ name: 'Apple', price: 1.99 });

// Two-way binding
label.bind_property('label', item, 'name',
  GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);
```

---

## 2. Component Composition

### Parent Template
```html
<script>
  import Header from './header.html';
  import Footer from './footer.html';
</script>

<vstack>
  <Header title="My App" />
  <label>Content here</label>
  <Footer />
</vstack>
```

### Generated Code
```javascript
import { createWidget as createHeader } from './header.gtk.mjs';
import { createWidget as createFooter } from './footer.gtk.mjs';

export function createWidget(deps) {
  const { vstack, label, self } = deps;
  
  // Create child components
  const header = createHeader({ 
    ...deps, 
    title: 'My App' 
  });
  
  const footer = createFooter(deps);
  
  // Compose
  return vstack([
    header.root,
    label('Content here'),
    footer.root
  ]);
}
```

### Self Context Propagation
```javascript
// Parent can access child widgets
const header = createHeader(deps);
self.header = header.self;  // Expose child's self context

// Later: self.header.title_label.set_label('New Title');
```

---

## 3. List Handling

### Input Template
```html
<script>
  let items = signal([
    { id: 1, name: 'Apple', price: 1.99 },
    { id: 2, name: 'Banana', price: 0.99 },
  ]);
  
  function selectItem(item) {
    selectedItem.value = item;
  }
</script>

{#each $items as item}
  <hstack>
    <button onclick={() => selectItem(item)}>{item.name}</button>
    <label>${item.price.toFixed(2)}</label>
  </hstack>
{/each}
```

### Generated Code
```javascript
import { defineClass, listview, signal, hstack, button, label } from 'jamrock/gtk';
import { GObject, Gio } from 'gi://Gtk?version=4.0';

// Define GObject class for list items
const ItemClass = defineClass('ShoppingItem', {
  id: GObject.ParamSpec.int('id', 'ID', 'Item ID',
    GObject.ParamFlags.READWRITE, 0, Infinity, 0),
  name: GObject.ParamSpec.string('name', 'Name', 'Item name',
    GObject.ParamFlags.READWRITE, ''),
  price: GObject.ParamSpec.double('price', 'Price', 'Item price',
    GObject.ParamFlags.READWRITE, 0, Infinity, 0),
}, class extends GObject.Object {
  _id = 0;
  _name = '';
  _price = 0;
});

export function createWidget(deps) {
  const items = signal([...]);
  
  function selectItem(item) { ... }
  
  // Create list store
  const store = Gio.ListStore.new(ItemClass);
  items.value.forEach((data, offset) => {
    store.append(new ItemClass({ offset, ...data }));
  });
  
  // Create list with factory pattern
  const list = listview(store, {
    // Factory creates hstack for each item
    Factory: class extends Gtk.Box {
      constructor() {
        super({ orientation: Gtk.Orientation.HORIZONTAL });
        this.btn = new Gtk.Button();
        this.lbl = new Gtk.Label();
        this.append(this.btn);
        this.append(this.lbl);
      }
    },
    
    onBind: (widget, item) => {
      widget.btn.set_label(item.name);
      widget.lbl.set_label(`$${item.price.toFixed(2)}`);
      
      // Track signal for cleanup
      const handlerId = widget.btn.connect('clicked', () => {
        selectItem(item);
      });
      trackSignal(widget.btn, handlerId);
    },
    
    onUnbind: (widget, item) => {
      // Signals auto-cleaned by listview helper
    },
  });
  
  // Reactivity: update store when items change
  items.subscribe((newItems) => {
    store.remove_all();
    newItems.forEach((data, offset) => {
      store.append(new ItemClass({ offset, ...data }));
    });
  });
  
  return { root: list, self };
}
```

---

## 4. Control Flow

### {#if} Blocks

**Input:**
```html
{#if $isLoggedIn}
  <label>Welcome back!</label>
{:else}
  <button onclick={login}>Login</button>
{/if}
```

**Generated:**
```javascript
const isLoggedIn = signal(false);

function renderContent() {
  if (isLoggedIn.value) {
    return label('Welcome back!');
  } else {
    return button('Login', { onClick: login });
  }
}

const content = renderContent();

// Reactivity: re-render on change
isLoggedIn.subscribe(() => {
  // Replace widget in parent
  const newContent = renderContent();
  parent.replace(content, newContent);
  content = newContent;
});
```

### {#if} with Multiple Conditions

**Input:**
```html
{#if $status === 'loading'}
  <spinner />
{:else if $status === 'error'}
  <label>Error: {$error}</label>
{:else}
  <label>Success!</label>
{/if}
```

**Generated:**
```javascript
const status = signal('loading');
const error = signal(null);

function renderStatus() {
  if (status.value === 'loading') {
    return spinner();
  } else if (status.value === 'error') {
    return label(`Error: ${error.value}`);
  } else {
    return label('Success!');
  }
}

// Subscribe to all signals used in condition
[status, error].forEach(sig => {
  sig.subscribe(() => {
    // Re-render and replace
  });
});
```

---

## 5. Event Handling

### Simple Events
```html
<button onclick={onClick}>Click Me</button>
```

**Generated:**
```javascript
button('Click Me', { onClick })
// DSL handles: btn.connect('clicked', onClick)
```

### Events with Parameters
```html
<button onclick={() => select(item)}>Select</button>
```

**Generated:**
```javascript
button('Select', { 
  onClick: () => select(item) 
})
```

### Custom Signals
```html
<entry onchange={(e) => text.value = e.value} />
```

**Generated:**
```javascript
entry('', { 
  onChange: (e) => { text.value = e.value; }
})
// DSL handles: buffer.connect('notify::text', ...)
```

---

## 6. State Management

### Local State
```html
<script>
  let count = signal(0);
  let name = signal('');
</script>
```

**Generated:**
```javascript
const count = signal(0);
const name = signal('');
```

### Props from Parent
```html
<script>
  export let title = 'Default';
</script>

<label>{title}</label>
```

**Generated:**
```javascript
export function createWidget(deps, props) {
  const { title = 'Default' } = props;
  
  return label(title);
}
```

### Derived State
```html
<script>
  let items = signal([...]);
  let total = computed(() => items.value.reduce((sum, i) => sum + i.price, 0));
</script>

<label>Total: ${$total}</label>
```

**Generated:**
```javascript
const items = signal([...]);
const total = computed(() => items.value.reduce((sum, i) => sum + i.price, 0));

const lbl = label(`Total: $${total.value}`);

total.subscribe((value) => {
  lbl.set_label(`Total: $${value}`);
});
```

---

## 7. Self Context

### Named Widgets
```html
<button name="submit_btn">Submit</button>
<entry name="email_input" placeholder="Email" />
```

**Generated:**
```javascript
const submit_btn = button('Submit', { name: 'submit_btn' });
const email_input = entry('Email', { name: 'email_input' });

// Self context populated by DSL
// self.submit_btn = submit_btn;
// self.email_input = email_input;
```

### External Access
```javascript
// In parent component
const form = createFormWidget(deps);

// Access child widgets
form.self.submit_btn.set_sensitive(false);
form.self.email_input.set_text('user@example.com');
```

---

## 8. Lifecycle Hooks

### onMount
```html
<script>
  import { onMount } from 'jamrock/gtk';
  
  onMount(() => {
    console.log('Widget mounted');
  });
</script>
```

**Generated:**
```javascript
export function createWidget(deps) {
  const { onMount } = deps;
  
  onMount(() => {
    console.log('Widget mounted');
  });
  
  return vstack([...]);
}
```

### onDestroy
```html
<script>
  import { onDestroy } from 'jamrock/gtk';
  
  onDestroy(() => {
    // Cleanup
  });
</script>
```

**Generated:**
```javascript
export function createWidget(deps) {
  const { onDestroy } = deps;
  
  const cleanup = onDestroy(() => {
    // Cleanup
  });
  
  return { root, self, cleanup };
}
```

---

## 9. CSS Styling

### Inline Classes
```html
<button class="primary large">Submit</button>
```

**Generated:**
```javascript
button('Submit', { className: 'primary large' })
// DSL: btn.add_css_class('primary'); btn.add_css_class('large');
```

### CSS Provider
```html
<style>
  .primary { background: @accent_color; }
  .large { padding: 16px; }
</style>
```

**Generated:**
```javascript
// CSS is extracted and loaded via Gtk.CssProvider
const provider = new Gtk.CssProvider();
provider.load_from_data(`
  .primary { background: @accent_color; }
  .large { padding: 16px; }
`);
Gtk.StyleContext.add_provider_for_display(
  Gdk.Display.get_default(),
  provider,
  Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
);
```

---

## 10. File Structure

### Input
```
src/
├── app.html
├── components/
│   ├── header.html
│   └── footer.html
└── pages/
    └── home.html
```

### Output (GTK Target)
```
generated/
├── app.gtk.mjs
├── components/
│   ├── header.gtk.mjs
│   └── footer.gtk.mjs
└── pages/
    └── home.gtk.mjs
```

### Runtime
```
dist/
└── gtk.mjs  # Runtime: signal, vstack, button, listview, etc.
```

---

## 11. CLI Usage

```bash
# Compile for GTK target
jamrock build --target gtk

# Compile single file
jamrock build app.html --target gtk --output app.gtk.mjs

# Run with GJS
gjs -m app.gtk.mjs
```

---

## 12. Comparison: DOM vs GTK Target

| Feature | DOM Target | GTK Target |
|---------|-----------|------------|
| Output | `$$.e('vstack', ...)` | `vstack([...])` |
| Reactivity | somedom signals | signals + GObject |
| Lists | `$$.map()` | Factory pattern |
| Events | `onclick` prop | `onClick` prop |
| Self | Not used | `self.widget_name` |
| Cleanup | Implicit | Explicit `onUnbind` |
| File extension | `.mjs` | `.gtk.mjs` |
