# GTK Compilation Target - Design Summary

## Overview

Instead of compiling Jamrock templates to vnode trees (virtual DOM), we generate direct GTK widget creation code using the proven DSL from `src/gtk4/elements.ts`.

## Design Documents

1. **[GTK_COMPILATION.md](./GTK_COMPILATION.md)** - Problem statement and solution overview
2. **[GTK_DSL_VS_RAW.md](./GTK_DSL_VS_RAW.md)** - DSL vs raw GTK comparison
3. **[GTK_DESIGN_COMPLETE.md](./GTK_DESIGN_COMPLETE.md)** - Complete design covering all aspects
4. **[GTK_RUNTIME_API.md](./GTK_RUNTIME_API.md)** - Runtime API specification

## Key Design Decisions

### 1. Same Parser, Different Target
```
Template → Parser (unchanged) → AST → reduceGTK() → DSL Code
```

### 2. DSL by Default, Raw GTK Opt-in
```javascript
// DSL (default)
vstack([label('Hello'), button('Click')])

// Raw GTK (opt-in)
new Gtk.Box({ orientation: VERTICAL })
```

### 3. Hybrid Reactivity
```javascript
// Component state: signals (familiar API)
const count = signal(0);

// List items: GObject properties (required for Gio.ListStore)
const ItemClass = defineClass('Item', { ... });
```

### 4. Factory Pattern for Lists
```javascript
listview(store, {
  onBind: (widget, item) => { ... },
  onUnbind: (widget, item) => { ... }
})
```

### 5. Self Context for External Access
```javascript
button('Click', { name: 'submit_btn' })
// Later: self.submit_btn.set_sensitive(false)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Template Source                          │
│  <vstack>                                                   │
│    <label>{$count}</label>                                  │
│    <button onclick={onClick}>Click</button>                  │
│  </vstack>                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Parser (src/markup/block.ts)                    │
│              Same for DOM and GTK targets                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AST Tree                                │
│  { type: 'element', name: 'vstack', elements: [...] }       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│  reduce() (DOM target)  │     │  reduceGTK() (GTK target)   │
│  src/markup/utils.ts    │     │  src/markup/gtk-utils.ts    │
└─────────────────────────┘     └─────────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│   $$.e('vstack', ...)  │     │  vstack([                   │
│   $$.e('label', ...)   │     │    label(`${count.value}`), │
│   $$.e('button', ...)  │     │    button('Click', { onClick })│
└─────────────────────────┘     │  ])                         │
                                └─────────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│    VNode Tree           │     │  Direct Widget Creation     │
│    (Virtual DOM)        │     │  (Native GTK via DSL)       │
└─────────────────────────┘     └─────────────────────────────┘
```

## Implementation Files

| File | Purpose |
|------|---------|
| `src/markup/gtk-utils.ts` | GTK-specific reduce function |
| `src/gtk4/elements.ts` | Widget DSL (already exists) |
| `src/gtk4/runtime.ts` | Runtime helpers (signal, defineClass, etc.) |
| `lib/gtk4/runtime.ts` | GJS-specific runtime (GI imports) |

## Benefits

1. **Stability**: No widget recreation issues (proven in gtk-js)
2. **Readability**: DSL is more compact than raw GTK
3. **Native Integration**: GObject property bindings
4. **Proper Lifecycle**: Factory pattern with cleanup
5. **Self Context**: Direct widget references

## Next Steps

1. **Implement `reduceGTK()`** - Complete the code generator
2. **Create runtime module** - Export `jamrock/gtk` package
3. **Update CLI** - Add `--target gtk` flag
4. **Test with playground** - Verify all components work
5. **Document** - Update user guide for GTK target

## Open Questions

1. **Signal implementation**: Use somedom or custom?
2. **Control flow reactivity**: How to handle `{#if}` updates?
3. **Component props**: How to pass props to child components?
4. **Error handling**: How to handle compilation errors?
