import { Gtk, Gdk, GLib } from '../dist/gtk.mjs';

// ===========================================
// GTK4 E2E Testing Toolkit
// ===========================================

let currentWindow = null;
let currentApp = null;

// -------------------------------------------
// Widget Tree Traversal
// -------------------------------------------

export function findWidget(widget, name) {
  if (widget.get_name?.() === name) return widget;
  let child = widget.get_first_child?.();
  while (child) {
    const found = findWidget(child, name);
    if (found) return found;
    child = child.get_next_sibling?.();
  }
  return null;
}

export function findWidgets(widget, predicate) {
  const results = [];
  function walk(w) {
    if (predicate(w)) results.push(w);
    let child = w.get_first_child?.();
    while (child) {
      walk(child);
      child = child.get_next_sibling?.();
    }
  }
  walk(widget);
  return results;
}

export function listWidgets(widget, depth = 0) {
  const indent = '  '.repeat(depth);
  const name = widget.get_name?.() || 'unnamed';
  const type = widget.constructor.name.replace('Gtk_', '');
  print(`${indent}${name} (${type})`);
  
  let child = widget.get_first_child?.();
  while (child) {
    listWidgets(child, depth + 1);
    child = child.get_next_sibling?.();
  }
}

// -------------------------------------------
// Widget Info
// -------------------------------------------

export function getWidgetInfo(widget, win = currentWindow) {
  const alloc = widget.get_allocation();
  const name = widget.get_name?.() || 'unnamed';
  const type = widget.constructor.name.replace('Gtk_', '');
  
  let winX = null, winY = null;
  if (win) {
    const [ok, x, y] = widget.translate_coordinates(win, 0, 0);
    if (ok) {
      winX = x;
      winY = y;
    }
  }
  
  return {
    name,
    type,
    x: alloc.x,
    y: alloc.y,
    width: alloc.width,
    height: alloc.height,
    winX,
    winY,
    visible: widget.is_visible?.() ?? null,
    sensitive: widget.get_sensitive?.() ?? null,
  };
}

export function getWidgetCenter(widget, win = currentWindow) {
  const [ok, x, y] = widget.translate_coordinates(win, 0, 0);
  if (!ok) return null;
  return {
    x: x + Math.floor(widget.get_allocated_width() / 2),
    y: y + Math.floor(widget.get_allocated_height() / 2),
  };
}

// -------------------------------------------
// Widget Queries
// -------------------------------------------

export function $(name) {
  return findWidget(currentWindow, name);
}

export function $$(predicate) {
  return findWidgets(currentWindow, predicate);
}

export function getByType(type) {
  return findWidgets(currentWindow, w => w.constructor.name.includes(type));
}

// -------------------------------------------
// Actions (Programmatic)
// -------------------------------------------

export function click(widget) {
  if (typeof widget === 'string') widget = $(widget);
  if (!widget) throw new Error('Widget not found');
  widget.emit('clicked');
}

export function activate(widget) {
  if (typeof widget === 'string') widget = $(widget);
  if (!widget) throw new Error('Widget not found');
  widget.activate?.();
}

export function toggle(widget, state) {
  if (typeof widget === 'string') widget = $(widget);
  if (!widget) throw new Error('Widget not found');
  if (widget.set_active) {
    widget.set_active(state);
  } else {
    widget.emit('toggled');
  }
}

export function setValue(widget, value) {
  if (typeof widget === 'string') widget = $(widget);
  if (!widget) throw new Error('Widget not found');
  if (widget.set_value) widget.set_value(value);
  else if (widget.set_text) widget.set_text(String(value));
}

export function setText(widget, text) {
  if (typeof widget === 'string') widget = $(widget);
  if (!widget) throw new Error('Widget not found');
  if (widget.set_text) widget.set_text(text);
  else if (widget.get_buffer) {
    const buf = widget.get_buffer();
    buf.set_text(text, text.length);
  }
}

// -------------------------------------------
// Assertions
// -------------------------------------------

export function isVisible(widget) {
  if (typeof widget === 'string') widget = $(widget);
  return widget?.is_visible?.() ?? false;
}

export function isEnabled(widget) {
  if (typeof widget === 'string') widget = $(widget);
  return widget?.get_sensitive?.() ?? false;
}

export function getText(widget) {
  if (typeof widget === 'string') widget = $(widget);
  if (!widget) return null;
  if (widget.get_label) return widget.get_label();
  if (widget.get_text) return widget.get_text();
  if (widget.get_buffer) {
    const buf = widget.get_buffer();
    const start = buf.get_start_iter();
    const end = buf.get_end_iter();
    return buf.get_text(start, end, false);
  }
  return null;
}

export function getValue(widget) {
  if (typeof widget === 'string') widget = $(widget);
  if (!widget) return null;
  if (widget.get_value) return widget.get_value();
  if (widget.get_active) return widget.get_active();
  return null;
}

// -------------------------------------------
// Event Tracking
// -------------------------------------------

export function trackEvents(widget, events = ['clicked', 'toggled', 'changed']) {
  if (typeof widget === 'string') widget = $(widget);
  if (!widget) throw new Error('Widget not found');
  
  const recorded = [];
  
  for (const event of events) {
    widget.connect(event, (...args) => {
      recorded.push({ event, time: Date.now(), args });
    });
  }
  
  return {
    get events() { return recorded; },
    get count() { return recorded.length; },
    clear() { recorded.length = 0; },
  };
}

// -------------------------------------------
// Window Management
// -------------------------------------------

export function setWindow(win) {
  currentWindow = win;
}

export function getWindow() {
  return currentWindow;
}

// -------------------------------------------
// Test Helpers
// -------------------------------------------

export function wait(ms) {
  return new Promise(resolve => {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
      resolve();
      return GLib.SOURCE_REMOVE;
    });
  });
}

export function waitFor(condition, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timeout'));
      } else {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, check);
      }
    };
    check();
  });
}

// -------------------------------------------
// Debug
// -------------------------------------------

export function highlight(widget, duration = 1000) {
  if (typeof widget === 'string') widget = $(widget);
  if (!widget) return;
  
  widget.add_css_class('e2e-highlight');
  
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, duration, () => {
    widget.remove_css_class('e2e-highlight');
    return GLib.SOURCE_REMOVE;
  });
}

export function debug() {
  print('=== E2E Debug ===');
  print('Window: ' + (currentWindow ? 'set' : 'null'));
  if (currentWindow) {
    listWidgets(currentWindow);
  }
}
