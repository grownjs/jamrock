import { Gtk, GLib } from './deps.ts';
import { createWindow } from './ctx.ts';
import { signal, computed } from './runtime.ts';

export { signal, computed } from './runtime.ts';

export function findAll(widget: any, predicate: (w: any) => boolean): any[] {
  const results: any[] = [];

  function walk(w: any) {
    if (!w) return;
    if (predicate(w)) results.push(w);
    if (w.get_first_child) {
      let child = w.get_first_child();
      while (child) {
        walk(child);
        child = child.get_next_sibling();
      }
    }
  }

  walk(widget);
  return results;
}

export function findWidgets(widget: any, typeName: string): any[] {
  return findAll(widget, (w: any) => {
    const name = w.constructor?.$gtype?.name || w.constructor?.name || '';
    return name === typeName;
  });
}

export function findButtons(widget: any): any[] {
  return findWidgets(widget, 'GtkButton');
}

export function findLabels(widget: any): any[] {
  return findWidgets(widget, 'GtkLabel');
}

export function findEntries(widget: any): any[] {
  return findWidgets(widget, 'GtkEntry');
}

export function clickButton(widget: any, label: string): boolean {
  const btns = findButtons(widget);
  const btn = btns.find((b: any) => b.get_label?.() === label);
  if (btn) {
    btn.emit('clicked');
    return true;
  }
  return false;
}

export function getWidgetTree(widget: any, depth = 0): string[] {
  const lines: string[] = [];
  const name = widget.constructor?.$gtype?.name || widget.constructor?.name || '?';
  const extra = widget.get_label ? ` label=${widget.get_label()}` : '';
  lines.push('  '.repeat(depth) + name + extra);
  if (widget.get_first_child) {
    let child = widget.get_first_child();
    while (child) {
      lines.push(...getWidgetTree(child, depth + 1));
      child = child.get_next_sibling();
    }
  }
  return lines;
}

export function createTestWindow(props: Record<string, unknown> = {}) {
  let passed = 0;
  let failed = 0;
  const assertions: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      assertions.push('  OK: ' + msg);
      passed++;
    } else {
      assertions.push('  FAIL: ' + msg);
      failed++;
    }
  }

  const { open, close, win } = createWindow({
    title: 'Test Window',
    width: 300,
    height: 200,
    ...props,
  });

  function scheduleTest(callback: (win: any, helpers: any) => void, delay = 500) {
    const helpers = {
      findButtons: () => findButtons(win),
      findLabels: () => findLabels(win),
      findEntries: () => findEntries(win),
      findWidgets: (typeName: string) => findWidgets(win, typeName),
      clickButton: (label: string) => clickButton(win, label),
      getWidgetTree: () => getWidgetTree(win),
    };

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
      callback(win, helpers);
      assertions.forEach(a => print(a));
      print(`\nResults: ${passed} passed, ${failed} failed`);
      close();
      return GLib.SOURCE_REMOVE;
    });
  }

  return { open, close, win, assert, scheduleTest, assertions: () => assertions };
}
