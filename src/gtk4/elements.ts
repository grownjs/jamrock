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
  const { onChange, active, ...defaults } = props;
  const el = one(Gtk.Switch, { ...defaults, active: active ?? false }, 'tgl', cb);

  el.connect('state-set', (_, state) => {
    if (typeof onChange === 'function') {
      onChange({ type: 'toggled', value: state });
    }
  });

  return el;
}

export function calendar(props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { onChange, ...defaults } = props;
  const el = one(Gtk.Calendar, defaults, 'cal', cb) as unknown as Gtk.Calendar;

  el.connect('day-selected', () => {
    if (typeof onChange === 'function') {
      const date = el.get_date();
      onChange({ type: 'selected', value: date });
    }
  });

  return el;
}

export function spinner(props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { spinning = true, ...defaults } = props;
  const el = one(Gtk.Spinner, defaults, 'spn', cb) as unknown as Gtk.Spinner;
  if (spinning) el.start();
  return el;
}

export function separator(props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { orientation = Gtk.Orientation.HORIZONTAL, ...defaults } = props;
  return one(Gtk.Separator, { ...defaults, orientation }, 'sep', cb);
}

export function overlay(child: GtkWidget, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { ...defaults } = props;
  const el = one(Gtk.Overlay, defaults, 'ovl', cb) as unknown as Gtk.Overlay;
  if (child) el.set_child(child);
  return el;
}

export function revealer(child: GtkWidget, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { reveal = true, transition = Gtk.RevealerTransitionType.CROSSFADE, ...defaults } = props;
  const el = one(Gtk.Revealer, { ...defaults, transition_type: transition }, 'rvl', cb) as unknown as Gtk.Revealer;
  if (child) el.set_child(child);
  el.set_reveal_child(reveal);
  return el;
}

export function grid(elements: GtkWidgets, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { columns = 1, ...defaults } = props;
  const el = one(Gtk.Grid, defaults, 'grd', cb) as unknown as Gtk.Grid;
  
  let col = 0;
  let row = 0;
  elements.forEach((child: GtkWidget) => {
    if (child) {
      el.attach(child, col, row, 1, 1);
      col++;
      if (col >= columns) {
        col = 0;
        row++;
      }
    }
  });
  
  return el;
}

export function frame(child: GtkWidget, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { label: frameLabel, ...defaults } = props;
  const el = one(Gtk.Frame, { ...defaults, label: frameLabel }, 'frm', cb) as unknown as Gtk.Frame;
  if (child) el.set_child(child);
  return el;
}

export function expander(child: GtkWidget, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { label: expanderLabel, expanded = false, onChange, ...defaults } = props;
  const el = one(Gtk.Expander, { ...defaults, label: expanderLabel, expanded }, 'exp', cb) as unknown as Gtk.Expander;
  if (child) el.set_child(child);
  
  el.connect('notify::expanded', () => {
    if (typeof onChange === 'function') {
      onChange({ type: 'toggled', value: el.get_expanded() });
    }
  });
  
  return el;
}

export function image(props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { icon = 'image-missing', size = Gtk.IconSize.LARGE, ...defaults } = props;
  return one(Gtk.Image, { ...defaults, icon_name: icon, pixel_size: size === Gtk.IconSize.LARGE ? 48 : 24 }, 'img', cb);
}

export function linkbutton(text: string, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { uri = '#', onClick, ...defaults } = props;
  const el = one(Gtk.LinkButton, { ...defaults, label: text, uri }, 'lnk', cb) as unknown as Gtk.LinkButton;
  
  if (onClick) {
    el.connect('clicked', () => onClick(el));
  }
  
  return el;
}

export function spinbutton(props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { value = 0, min = 0, max = 100, step = 1, onChange, ...defaults } = props;
  const adjustment = new Gtk.Adjustment({ value, lower: min, upper: max, step_increment: step });
  const el = one(Gtk.SpinButton, { ...defaults, adjustment }, 'spb', cb) as unknown as Gtk.SpinButton;
  
  if (onChange) {
    el.connect('value-changed', () => {
      onChange({ type: 'modified', value: el.get_value() });
    });
  }
  
  return el;
}

export function textview(props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { text = '', onChange, ...defaults } = props;
  const el = one(Gtk.TextView, { ...defaults, wrap_mode: Gtk.WrapMode.WORD }, 'txv', cb) as unknown as Gtk.TextView;
  
  if (text) {
    el.get_buffer().set_text(text, text.length);
  }
  
  if (onChange) {
    el.get_buffer().connect('changed', () => {
      const buffer = el.get_buffer();
      const start = buffer.get_start_iter();
      const end = buffer.get_end_iter();
      const content = buffer.get_text(start, end, false);
      onChange({ type: 'modified', value: content });
    });
  }
  
  return el;
}

export function infobar(props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { message = '', type = Gtk.MessageType.INFO, revealed = true, onClose, ...defaults } = props;
  const el = one(Gtk.InfoBar, { ...defaults, message_type: type, revealed }, 'inf', cb) as unknown as Gtk.InfoBar;
  
  if (message) {
    const label = new Gtk.Label({ label: message });
    el.add_child(label);
  }
  
  if (onClose) {
    el.connect('response', () => {
      onClose();
    });
  }
  
  return el;
}

export function levelbar(value: number, props: ElementProps = {}, cb: AfterCallback | null = null) {
  const { min = 0, max = 1, ...defaults } = props;
  const el = one(Gtk.LevelBar, { ...defaults, min_value: min, max_value: max, value }, 'lvl', cb) as unknown as Gtk.LevelBar;
  return el;
}
