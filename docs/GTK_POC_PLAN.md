# GTK DSL Proof of Concept Plan

## Goal

Prove the DSL path works before implementing the compiler. All examples must be written using the DSL directly.

## Phase 1: Verify Existing DSL

### 1.1 Test Current DSL Functions

**File:** `src/gtk4/elements.ts`

**Test each function:**
- [ ] `vstack`, `hstack`, `box` - containers
- [ ] `button`, `label`, `entry` - basic widgets
- [ ] `toggle`, `check`, `push` - input widgets
- [ ] `listview`, `dropdown` - list widgets
- [ ] `scroll`, `overlay`, `stack` - layout widgets
- [ ] `progress`, `level`, `spinner` - display widgets

**Test script:**
```bash
# Create test file
cat > /tmp/test-dsl.mjs << 'EOF'
import { createApplication, vstack, hstack, label, button, self } from './dist/gtk.mjs';

createApplication({ title: 'DSL Test' }, ({ open }) => {
  open(({ vstack, label, button }) => vstack([
    label('Hello from DSL!'),
    button('Click Me', { 
      onClick: () => console.log('clicked'),
      name: 'test_btn'
    })
  ]));
});
EOF

# Run with GJS
gjs -m /tmp/test-dsl.mjs
```

### 1.2 Test Self Context

```javascript
// Verify self context works
button('Test', { name: 'my_btn' });
console.log(self.my_btn); // Should be Gtk.Button
self.my_btn.set_label('Updated!'); // Should work
```

### 1.3 Test Listview Factory

```javascript
// Verify factory pattern works
import { Gio, GObject } from 'gi://Gtk?version=4.0';

const ItemClass = GObject.registerClass({
  GTypeName: 'TestItem',
  Properties: {
    name: GObject.ParamSpec.string('name', 'Name', 'Item name',
      GObject.ParamFlags.READWRITE, ''),
  },
}, class extends GObject.Object {
  _name = '';
});

const store = Gio.ListStore.new(ItemClass);
store.append(new ItemClass({ name: 'Item 1' }));
store.append(new ItemClass({ name: 'Item 2' }));

const list = listview(store, {
  onBind: (widget, item) => {
    widget.set_label(item.name);
  },
  onUnbind: (widget, item) => {
    // cleanup
  }
});
```

---

## Phase 2: Add Signal Support

### 2.1 Implement Signal Function

**File:** `src/gtk4/runtime.ts`

```typescript
export function signal<T>(initial: T) {
  let value = initial;
  const subscribers = new Set<(v: T) => void>();
  
  return {
    get value() { return value; },
    set value(v: T) {
      if (value !== v) {
        value = v;
        subscribers.forEach(cb => cb(v));
      }
    },
    subscribe(cb: (v: T) => void) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    peek() { return value; }
  };
}

export function computed<T>(fn: () => T) {
  // Simple implementation - recalculate on access
  return {
    get value() { return fn(); }
  };
}
```

### 2.2 Test Signal Integration

```javascript
import { signal, createApplication, vstack, label, button, self } from './dist/gtk.mjs';

createApplication({ title: 'Signal Test' }, ({ open }) => {
  const count = signal(0);
  
  const countLabel = label(`Count: ${count.value}`);
  
  count.subscribe(v => {
    countLabel.set_label(`Count: ${v}`);
  });
  
  open(() => vstack([
    countLabel,
    button('Increment', { 
      onClick: () => { count.value += 1; }
    })
  ]));
});
```

---

## Phase 3: Convert Playground Examples

### 3.1 Convert button.html to DSL

**Current (template):**
```html
<script>
  let clicks = signal(0);
  function onClick() { clicks.value += 1; }
</script>

<vstack>
  <label>Clicks: {$clicks}</label>
  <button onclick="{onClick}">Click Me</button>
</vstack>
```

**Target (DSL):**
```javascript
import { createApplication, vstack, label, button, signal } from 'jamrock/gtk';

export function createWidget(deps) {
  const clicks = signal(0);
  
  const countLabel = label(`Clicks: ${clicks.value}`);
  clicks.subscribe(v => countLabel.set_label(`Clicks: ${v}`));
  
  return vstack([
    countLabel,
    button('Click Me', { onClick: () => { clicks.value += 1; } })
  ]);
}

// For standalone testing
if (import.meta.main) {
  createApplication({ title: 'Button Test' }, ({ open }) => {
    open(deps => createWidget(deps));
  });
}
```

### 3.2 Convert shopping.html to DSL

**Key challenge:** List with factory pattern

```javascript
import { createApplication, vstack, hstack, label, button, listview, signal } from 'jamrock/gtk';
import { Gio, GObject } from 'gi://Gtk?version=4.0';

// Define GObject class for items
const ItemClass = GObject.registerClass({
  GTypeName: 'ShoppingItem',
  Properties: {
    id: GObject.ParamSpec.int('id', ...),
    name: GObject.ParamSpec.string('name', ...),
    price: GObject.ParamSpec.double('price', ...),
  },
}, class extends GObject.Object { ... });

export function createWidget(deps) {
  const items = signal([
    { id: 1, name: 'Apple', price: 1.99 },
    { id: 2, name: 'Banana', price: 0.99 },
  ]);
  
  const selectedItem = signal(null);
  
  // Create store
  const store = Gio.ListStore.new(ItemClass);
  items.value.forEach(item => store.append(new ItemClass(item)));
  
  // Reactivity: update store when items change
  items.subscribe(newItems => {
    store.remove_all();
    newItems.forEach(item => store.append(new ItemClass(item)));
  });
  
  return vstack([
    label('Shopping List'),
    listview(store, {
      onBind: (widget, item) => {
        widget.set_label(`${item.name} - $${item.price.toFixed(2)}`);
        widget.connect('clicked', () => selectedItem.value = item);
      },
      onUnbind: (widget) => {
        // cleanup
      }
    }),
    label(() => selectedItem.value ? `Selected: ${selectedItem.value.name}` : 'No selection'),
  ]);
}
```

### 3.3 Convert All Playground Examples

| Example | Key Features | Status |
|---------|-------------|--------|
| button.html | Signal, click handler | Pending |
| shopping.html | List, factory pattern | Pending |
| todo.html | List, CRUD operations | Pending |
| memory.html | Grid, game state | Pending |
| clock.html | Timer, intervals | Pending |
| colorpicker.html | Sliders, color state | Pending |
| ... | ... | ... |

---

## Phase 4: Test Suite

### 4.1 Create GTK Test Runner

**File:** `tests/gtk/runner.mjs`

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runGTKTest(file) {
  const { stdout, stderr } = await execAsync(`gjs -m ${file}`, {
    timeout: 5000
  });
  return { stdout, stderr };
}
```

### 4.2 Create Test Cases

**File:** `tests/gtk/button.test.mjs`

```javascript
import { test } from '@japa/runner';
import { runGTKTest } from './runner.mjs';

test('button widget creates correctly', async ({ expect }) => {
  const { stdout, stderr } = await runGTKTest('./examples/button.gtk.mjs');
  expect(stderr).toBe('');
});

test('button click updates label', async ({ expect }) => {
  // Test with mock/simulation
});
```

---

## Phase 5: Document DSL API

### 5.1 Create DSL Reference

**File:** `docs/GTK_DSL_REFERENCE.md`

Document all DSL functions with examples.

### 5.2 Create Migration Guide

**File:** `docs/GTK_MIGRATION.md`

Guide for converting templates to DSL code.

---

## Success Criteria

1. ✅ All DSL functions work in GJS
2. ✅ Signal implementation works
3. ✅ All playground examples converted to DSL
4. ✅ All examples run without crashes
5. ✅ Test suite passes
6. ✅ Documentation complete

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | 1 day | DSL verification |
| Phase 2 | 1 day | Signal support |
| Phase 3 | 2 days | Playground examples |
| Phase 4 | 1 day | Test suite |
| Phase 5 | 1 day | Documentation |

**Total: ~6 days**
