# GTK Compilation: DSL vs Raw GTK

## Two Output Modes

### 1. DSL Mode (Default) - Uses `src/gtk4/elements.ts`

**Generated code:**
```javascript
import { vstack, label, button, self } from 'jamrock/gtk';

export function createWidget(deps) {
  const { signal } = deps;
  
  const clicks = signal(0);
  
  function onClick() {
    clicks.value += 1;
  }
  
  return vstack([
    label(`Clicks: ${clicks.value}`),
    button('Click Me', { onClick })
  ]);
}
```

**Pros:**
- Readable, compact
- Proven in gtk-js
- Self context built-in
- Event handling simplified

### 2. Raw GTK Mode (Opt-in) - Direct `new Gtk.*()` calls

**Generated code:**
```javascript
import { Gtk, GObject } from 'gi://Gtk?version=4.0';

export function createWidget(deps) {
  const clicks = signal(0);
  
  function onClick() {
    clicks.value += 1;
  }
  
  const root = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 8,
  });
  
  const lbl = new Gtk.Label({ label: `Clicks: ${clicks.value}` });
  root.append(lbl);
  
  const btn = new Gtk.Button({ label: 'Click Me' });
  btn.connect('clicked', onClick);
  root.append(btn);
  
  return root;
}
```

**Pros:**
- Full control
- No abstraction overhead
- Direct GTK API

## Implementation

The `reduceGTK()` function can output either mode:

```typescript
// DSL mode (default)
memo.push(`${tabs}${name}(${children}, ${props})`);

// Raw GTK mode (opt-in)
memo.push(`${tabs}const ${id} = new ${gtkClass}({ ${props} });`);
memo.push(`${tabs}${parent}.append(${id});`);
```

## Lists: DSL Handles Factory Pattern

**Input:**
```html
{#each $items as item}
  <button onclick={() => select(item)}>{item.name}</button>
{/each}
```

**DSL Output:**
```javascript
listview(store, {
  onBind: (widget, item) => {
    widget.set_label(item.name);
    widget.connect('clicked', () => select(item));
  },
  onUnbind: (widget, item) => {
    // auto-cleanup by listview helper
  }
})
```

**Raw GTK Output:**
```javascript
const factory = Gtk.SignalListItemFactory.new();
factory.connect('setup', (_, listItem) => {
  listItem.set_child(new Gtk.Button());
});
factory.connect('bind', (_, listItem) => {
  const item = listItem.item;
  const btn = listItem.child;
  btn.set_label(item.name);
  btn.connect('clicked', () => select(item));
});
factory.connect('unbind', (_, listItem) => {
  // manual cleanup
});
const list = new Gtk.ListView({ model: selection, factory });
```

## Recommendation

**Use DSL by default:**
- Proven in gtk-js (hundreds of widgets, no crashes)
- Handles factory pattern complexity
- Self context for external access
- Event handling simplified

**Opt-in to raw GTK when:**
- Need full control
- Performance critical
- Custom widget behavior
