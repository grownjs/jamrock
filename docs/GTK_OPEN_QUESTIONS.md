# GTK Compilation Target - Open Questions Analysis

## Current State

The DSL in `src/gtk4/elements.ts` already exists and is proven in gtk-js. It provides:
- Widget factories: `vstack`, `hstack`, `button`, `label`, `entry`, `listview`, etc.
- Self context: `self.widget_name` for external access
- Event handling: `onClick`, `onChange`, `onToggle`, etc.
- Application lifecycle: `createApplication`, `createWindow`

**What's missing:**
1. Signal implementation for reactivity
2. Reactive `{#if}` handling
3. Component props pattern

---

## Question 1: Signal Implementation

### Option A: Use somedom signals (current Jamrock approach)

```typescript
import { signal, computed, effect } from 'somedom';

const count = signal(0);
count.subscribe(v => label.set_label(`Count: ${v}`));
```

**Pros:**
- Familiar API for Jamrock users
- Already works in DOM target
- Good for component state

**Cons:**
- Not integrated with GObject
- Can't use with `Gio.ListStore` directly

### Option B: Custom GTK signals

```typescript
function signal<T>(initial: T) {
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
    }
  };
}
```

**Pros:**
- Simple, no dependencies
- Works with GObject

**Cons:**
- Need to implement from scratch

### Option C: Hybrid - Signals + GObject

```typescript
// Component state: signals
const count = signal(0);

// List items: GObject properties
const ItemClass = defineClass('Item', {
  name: GObject.ParamSpec.string(...),
  price: GObject.ParamSpec.double(...),
});

// Bridge: signal updates GObject
count.subscribe(v => {
  item.set_property('count', v);
});
```

**Recommendation: Option C (Hybrid)**

- Signals for component state (familiar API)
- GObject for list items (required for `Gio.ListStore`)
- Bridge when needed

---

## Question 2: `{#if}` Reactivity

### The Problem

In DOM, `{#if}` creates/destroys DOM nodes. In GTK, widgets are heavier.

### Option A: Rebuild on change

```typescript
const isLoggedIn = signal(false);

let content = renderContent();
parent.append(content);

isLoggedIn.subscribe(() => {
  parent.remove(content);
  content = renderContent();
  parent.append(content);
});

function renderContent() {
  if (isLoggedIn.value) {
    return label('Welcome!');
  } else {
    return button('Login', { onClick: login });
  }
}
```

**Pros:**
- Simple
- Matches DOM behavior

**Cons:**
- Widget recreation is expensive
- Signal handlers need cleanup

### Option B: Visibility toggle

```typescript
const isLoggedIn = signal(false);

const welcomeLabel = label('Welcome!');
const loginButton = button('Login', { onClick: login });

// Both exist, only one visible
isLoggedIn.subscribe(v => {
  welcomeLabel.set_visible(v);
  loginButton.set_visible(!v);
});

return vstack([
  welcomeLabel,
  loginButton
]);
```

**Pros:**
- No widget recreation
- Fast switching

**Cons:**
- Both widgets exist in memory
- Doesn't work for complex trees

### Option C: Stack widget

```typescript
const isLoggedIn = signal(false);

const stack = new Gtk.Stack();
stack.add_named(label('Welcome!'), 'logged-in');
stack.add_named(button('Login'), 'logged-out');

isLoggedIn.subscribe(v => {
  stack.set_visible_child_name(v ? 'logged-in' : 'logged-out');
});
```

**Pros:**
- GTK-native approach
- Handles complex trees
- Animation support

**Cons:**
- All branches exist in memory

### Option D: Revealer widget

```typescript
const isLoggedIn = signal(false);

const revealer = revealer(label('Welcome!'), {
  reveal: isLoggedIn.value
});

isLoggedIn.subscribe(v => {
  revealer.set_reveal_child(v);
});
```

**Recommendation: Option C (Stack) for complex, Option B (Visibility) for simple**

- Simple conditions: visibility toggle
- Complex trees: Stack widget
- Animated: Revealer widget

---

## Question 3: Component Props

### Current gtk-js Pattern

```typescript
// Component definition
function myTrackList(deps, props) {
  const { onAction, onChange } = props;
  // ... build widget
  return vstack([...]);
}

// Usage
myTrackList.new = (props) => use(deps => myTrackList(deps, props));

// In parent
myTrackList.new({
  onAction: (action) => { ... },
  onChange: (type, selection) => { ... }
})
```

### Proposed Pattern for Jamrock

**Template:**
```html
<script>
  export let title = 'Default Title';
  export let onAction = null;
</script>

<vstack>
  <label>{title}</label>
  <button onclick={onAction}>Action</button>
</vstack>
```

**Generated Code:**
```typescript
export function createWidget(deps, props) {
  const { title = 'Default Title', onAction = null } = props;
  const { vstack, label, button } = deps;
  
  return vstack([
    label(title),
    button('Action', { onClick: onAction })
  ]);
}
```

**Usage:**
```typescript
import { createWidget as createHeader } from './header.gtk.mjs';

const header = createHeader(deps, {
  title: 'My App',
  onAction: () => console.log('clicked')
});
```

---

## Question 4: E2E Testing Path

### Current Problem

The current e2e path uses TestCafe for browser testing. This doesn't work for GTK4.

### Proposed Solution

1. **Prove DSL works first** - All examples written in DSL
2. **Generate DSL code** - Template → DSL code
3. **Test with GJS** - Run generated code with `gjs -m`

### Test Strategy

```bash
# 1. Compile template to DSL
jamrock build playground/button.html --target gtk

# 2. Run with GJS
gjs -m generated/playground/button.gtk.mjs

# 3. Verify output
# - Widget tree created
# - Events connected
# - Self context populated
```

### Example Test

```typescript
// tests/gtk/button.test.ts
import { createWidget } from '../generated/playground/button.gtk.mjs';

const { root, self } = createWidget(deps);

// Verify structure
assert(root instanceof Gtk.Box);
assert(self.label_0 instanceof Gtk.Label);
assert(self.button_1 instanceof Gtk.Button);

// Test interaction
self.button_1.emit('clicked');
// ... verify state change
```

---

## Summary of Recommendations

| Question | Recommendation |
|----------|---------------|
| Signal implementation | Hybrid: signals for state, GObject for lists |
| `{#if}` reactivity | Stack for complex, visibility for simple |
| Component props | `createWidget(deps, props)` pattern |
| E2E testing | Prove DSL first, test with GJS |

## Next Steps

1. **Implement signal()** in `src/gtk4/runtime.ts`
2. **Update reduceGTK()** to handle `{#if}` with Stack
3. **Test DSL** with existing playground examples
4. **Document** the DSL API for users
