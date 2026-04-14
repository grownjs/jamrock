import { Gtk, Gdk, Gio, GLib, Soup, GObject } from './deps.ts';
import { cls } from './util.ts';

import type { GtkWidget, GtkWidgets, SelfContext, ElementProps, AfterCallback, ElementFactory } from './main.ts';

const BASE_UNIT = 8;
const SHARED_LIB = { Gtk, Gdk, Gio, GLib, Soup, GObject, BASE_UNIT };

export const self: SelfContext = Object.create(null);

export function tag(factory: ElementFactory, props: ElementProps, name: string, cb: AfterCallback | null) {
  const { name: tagId, disabled, className, ...defaults } = props;
  const { overrides, classes, hooks } = cls(className ?? name, SHARED_LIB);

  const el = factory(SHARED_LIB, { ...defaults, ...overrides });
  if (classes && el?.add_css_class) classes.forEach(name => name && el.add_css_class(name));
  if (hooks) hooks.forEach(cb => cb(el));
  if (disabled) el.set_sensitive(false);
  if (tagId) self[tagId] = el;
  if (cb) cb(el, SHARED_LIB);
  return el;
}

export function many(Widget: any, elements: GtkWidgets, props: ElementProps, name: string, cb: AfterCallback | null) {
  const el = tag((_, defaults) => new Widget(defaults), props, name, cb);
  // @ts-expect-error
  elements.forEach(child => child && el.append(child));
  return el;
}

export function one(Widget: any, props: ElementProps, name: string, cb: AfterCallback | null) {
  return tag((_, defaults) => new Widget(defaults), props, name, cb);
}

export function box(elements: GtkWidgets, props: ElementProps = {}, cb: AfterCallback | null = null) {
  return many(Gtk.Box, elements, props, 'box', cb);
}

export function vstack(elements: GtkWidgets, props: ElementProps = {}, cb: AfterCallback | null = null) {
  return many(Gtk.Box, elements, { orientation: Gtk.Orientation.VERTICAL, ...props }, 'vbox', cb);
}

export function hstack(elements: GtkWidgets, props: ElementProps = {}, cb: AfterCallback | null = null) {
  return many(Gtk.Box, elements, { orientation: Gtk.Orientation.HORIZONTAL, ...props }, 'hbox', cb);
}

export function button(text: string, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { onClick, ...defaults } = props;
  const el = one(Gtk.Button, { ...defaults, label: text }, 'btn', cb);
  if (onClick) el.connect('clicked', () => onClick(el));
  return el;
}

export function label(text: string, props: ElementProps = {}, cb: AfterCallback | null = null) {
  return one(Gtk.Label, { ...props, label: text, wrap: true }, 'lbl', cb);
}

export function entry(placeholder: string = '', props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { onChange, ...overrides } = props;

  const el = one(Gtk.Entry, {
    primary_icon_name: 'edit-find-symbolic',
    placeholder_text: placeholder,
    ...overrides,
  }, 'in', cb);

  // @ts-expect-error
  const buffer = el.get_buffer();

  buffer.connect('notify::length', () => {
    if (typeof onChange === 'function') {
      onChange({ type: 'modified', value: buffer.get_text() });
    }
  });
  el.connect('activate', () => {
    if (typeof onChange === 'function') {
      onChange({ type: 'activated', value: buffer.get_text() });
    }
  });
  return el;
}

export function listview(store: any, {
  Factory = Gtk.Label,
  Widget = Gtk.ListView,
  Mode = Gtk.SingleSelection,
  selection: _selection,
  onChange,
  onBind,
  onOff,
  nested,
  ...props
}: ElementProps = {}, cb: AfterCallback | null = null) {
  const factory = Gtk.SignalListItemFactory.new();
  const selection: Gtk.SingleSelection = _selection || new Mode({ model: store });

  factory.connect('setup', (_factory, listItem) => {
    if (nested) {
      const expander = new Gtk.TreeExpander({ indent_for_icon: false });
      const label = new Gtk.Label();

      expander.set_child(label);
      // @ts-expect-error
      listItem.set_child(expander);
    } else {
      // @ts-expect-error
      listItem.set_child(new Factory());
    }
  });

  factory.connect('unbind', (_factory, listItem) => {
    // @ts-expect-error
    const item = listItem.item;

    let selected = item;
    let label;
    if (nested) {
      // @ts-expect-error
      label = listItem.child.child;
      selected = item.item;
    } else {
      // @ts-expect-error
      label = listItem.child;
    }

    if (typeof onOff === 'function') {
      onOff(label, selected);
    }
  });

  factory.connect('bind', (_factory, listItem) => {
    // @ts-expect-error
    const item = listItem.item;

    let selected = item.item;
    let label;
    if (nested) {
      // @ts-expect-error
      const expander = listItem.child;
      // @ts-expect-error
      const treeListRow = listItem.item;

      let toggled = true;
      if (expander) {
        label = expander.get_child();

        expander.set_list_row(treeListRow);

        treeListRow.connect('notify::expanded', (row: any) => {
          if (typeof onChange === 'function') {
            if (row.expanded) {
              onChange({ type: 'toggled', value: row.get_item(), toggled });
              toggled = false;
            } else if (!toggled) {
              onChange({ type: 'toggled', value: row.get_item(), toggled });
              toggled = true;
            }
          }
        });
      }
    } else {
      // @ts-expect-error
      label = listItem.child;
    }

    if (label instanceof Gtk.Label) {
      label.set_label(item.toString());
      label.set_halign(Gtk.Align.START);
      label.add_css_class('item');
      label.set_hexpand(true);
    }

    if (typeof onBind === 'function') {
      onBind(label, selected);
    }
  });

  selection.connect('notify::selected-item', () => {
    if (typeof onChange === 'function') {
      // @ts-expect-error
      onChange({ type: 'selected', value: selection.model.get_row(selection.get_selected()).get_item() });
    }
  });

  const el = one(Widget, {
    ...props,
    model: selection,
    factory: factory,
  }, 'lst', cb);

  selection.connect('selection-changed', () => {
    const selectedPosition = selection.get_selected();

    if (selectedPosition !== Gtk.INVALID_LIST_POSITION) {
      el.scroll_to(selectedPosition, Gtk.ListScrollFlags.FOCUS, null);

      if (typeof onChange === 'function') {
        // @ts-expect-error
        onChange({ type: 'modified', value: selection.model.get_row(selectedPosition).get_item() });
      }
    }
  });

  el.connect('activate', (_, position) => {
    if (typeof onChange === 'function') {
      // @ts-expect-error
      onChange({ type: 'activated', value: selection.model.get_row(position).get_item() });
    }
  });

  // @ts-expect-error
  el.set_single_click_activate(false);
  return el;
}

export function dropdown(store: any, props: ElementProps = {}, cb: AfterCallback | null = null) {
  return listview(store, { ...props, Widget: Gtk.DropDown }, cb);
}

export function scroll(el: GtkWidget, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { min, max, ...defaults } = props;
  const root = one(Gtk.ScrolledWindow, {
    ...defaults,
    min_content_height: min || 1,
    max_content_height: max || 200,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
  }, 'scr', cb);

  // @ts-expect-error
  root.set_child(el);
  return root;
}

export function progress(value: number, props: ElementProps = {}, cb: AfterCallback | null = null) {
  return one(Gtk.ProgressBar, { ...props, fraction: value }, 'pg', cb);
}

export function level(value: number, props: ElementProps = {}, cb: AfterCallback | null = null) {
  return one(Gtk.LevelBar, { ...props, value }, 'lvl', cb);
}

export function range(value: number, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { onChange, ...defaults } = props;
  const adjustment = new Gtk.Adjustment({
    value,
    lower: 0,
    upper: 100,
    step_increment: 1,
    page_increment: 10,
  });

  const el = one(Gtk.Scale, {
    ...defaults,
    orientation: Gtk.Orientation.HORIZONTAL,
    adjustment,
    digits: 2,
    draw_value: true,
    hexpand: true,
  }, 'rg', cb);

  adjustment.connect('value-changed', () => {
    if (typeof onChange === 'function') {
      onChange({ type: 'modified', value: adjustment.get_value() });
    }
  });

  return el;
}

export function push(text: string, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { onToggle, ...defaults } = props;
  const el = one(Gtk.ToggleButton, {
    ...defaults,
    label: text,
  }, 'psh', cb);

  el.connect('toggled', () => {
    // @ts-expect-error
    if (onToggle) onToggle(el.get_active());
  });
  return el;
}

export function toggle(_: any, props: ElementProps = {}, cb: AfterCallback | null = null) {
  return one(Gtk.Switch, props, 'tgl', cb);
}
