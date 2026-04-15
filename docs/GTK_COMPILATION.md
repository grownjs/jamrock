# GTK-Specific Compilation Target

## Problem

Jamrock's current approach compiles templates to vnode trees, then renders vnodes to GTK widgets. This works for web (DOM diffing), but GTK4 has a different model:

| Aspect | Current (Virtual DOM) | GTK-Native |
|--------|----------------------|------------|
| Widget creation | Recreates on re-render | Create once, reuse |
| Reactivity | somedom signals | GObject bindings |
| Lists | `$$.map()` to vnodes | Factory pattern |
| Cleanup | Implicit | Explicit unbind |
| GObject | Not integrated | Required |

## Solution: Generate GTK-Specific Code

Instead of vnode trees, generate direct GTK widget creation code.

### Example: button.html

**Input:**
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

**Current Output (vnode):**
```javascript
export const __template = ($$, {clicks, onClick}) => [
  $$.e('vstack', {}, [
    $$.e('label', {}, ["Clicks: ", function $signal() { return clicks.value; }]),
    $$.e('button', { onclick: onClick }, ["Click Me"])
  ])
];
```

**GTK-Native Output:**
```javascript
import { Gtk, GObject } from 'gi://Gtk?version=4.0';
import { self, signal } from 'jamrock/gtk';

export function createWidget(deps) {
  // State
  const clicks = signal(0);

  // Event handlers
  function onClick() {
    clicks.value += 1;
  }

  // Create widgets ONCE
  const clicks_label = new Gtk.Label({ label: 'Clicks: 0' });
  const click_btn = new Gtk.Button({ label: 'Click Me' });
  const root = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 8,
  });

  // Setup event handlers
  click_btn.connect('clicked', onClick);

  // Setup reactivity
  clicks.subscribe((value) => {
    clicks_label.set_label(`Clicks: ${value}`);
  });

  // Build widget tree
  root.append(clicks_label);
  root.append(click_btn);

  // Self context for external access
  self.clicks_label = clicks_label;
  self.click_btn = click_btn;

  return { root, self };
}
```

### Example: shopping.html (Lists)

**Input:**
```html
<script>
  let items = signal([{ id: 1, name: 'Apple', price: 1.99 }]);
  function selectItem(item) { ... }
</script>

{#each $items as item}
  <button onclick={() => selectItem(item)}>{item.name}</button>
{/each}
```

**GTK-Native Output:**
```javascript
import { Gtk, GObject, Gio } from 'gi://Gtk?version=4.0';
import { self, signal, defineClass, listview } from 'jamrock/gtk';

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
  const items = signal([
    { id: 1, name: 'Apple', price: 1.99 },
  ]);

  function selectItem(item) { /* ... */ }

  // Create list store
  const store = Gio.ListStore.new(ItemClass);
  items.value.forEach((data, offset) => {
    store.append(new ItemClass({ offset, ...data }));
  });

  // Create list with factory pattern
  const list = listview(store, {
    onBind: (btn, item) => {
      btn.set_label(item.name);
      // Track signal for cleanup
      const handlerId = btn.connect('clicked', () => selectItem(item));
      trackSignal(btn, handlerId);
    },
    onUnbind: (btn, item) => {
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

## Key Benefits

1. **Stability**: No widget recreation issues
2. **Native reactivity**: GObject property bindings
3. **Proper lifecycle**: Factory pattern with cleanup
4. **Self context**: Direct widget references
5. **Performance**: No virtual DOM overhead

## Implementation Plan

1. **Create GTK compiler target** (`src/gtk-compiler.ts`)
   - Parse template to widget tree
   - Generate direct widget creation code
   - Handle signals, events, bindings

2. **Create GTK runtime** (`lib/gtk4/runtime.ts`)
   - Signal implementation
   - Widget factory functions
   - List factory helpers
   - GObject class registration

3. **Update CLI**
   - Add `--target gtk` flag
   - Generate GTK-specific output

4. **Update Explorer**
   - Use GTK-native compilation
   - Test with all playground components

## Open Questions

1. **Signal vs GObject properties**: Should we use somedom signals or GObject properties for state?
   - Signals: Familiar API, works with existing code
   - GObject: Native GTK integration, property bindings

2. **Hybrid approach**: Could we support both?
   - Use GObject properties for list items
   - Use signals for component state

3. **Composition**: How to handle nested components?
   - Generate function calls
   - Pass self context down
