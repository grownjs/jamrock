/**
 * Signal Tracker Panel
 *
 * Shows all reactive signals from the target app with live values.
 */

import { Gtk, GLib } from '../../dist/gtk.mjs';

export function createSignalsPanel(bridge) {
  const signals = new Map(); // name → { value, prev, count, lastTime, row }

  // ─── Layout ─────────────────────────────────────────────────────────────────

  const header = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
  header.set_margin_start(8);
  header.set_margin_top(4);
  header.set_margin_bottom(4);

  const titleLbl = new Gtk.Label({ label: 'Signals' });
  titleLbl.add_css_class('heading');
  titleLbl.set_halign(Gtk.Align.START);
  titleLbl.set_hexpand(true);

  const btnClear = new Gtk.Button({ label: 'Clear' });
  btnClear.add_css_class('flat');

  header.append(titleLbl);
  header.append(btnClear);

  // Column headers
  const colHeader = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
  colHeader.set_margin_start(8);
  colHeader.set_margin_end(8);
  colHeader.add_css_class('dim-label');

  const makeColHdr = (text, width) => {
    const l = new Gtk.Label({ label: text });
    l.set_halign(Gtk.Align.START);
    l.set_size_request(width, -1);
    return l;
  };
  colHeader.append(makeColHdr('Name', 120));
  colHeader.append(makeColHdr('Value', 160));
  colHeader.append(makeColHdr('Prev', 120));
  colHeader.append(makeColHdr('Changes', 70));
  colHeader.append(makeColHdr('Last', 80));

  // Signal rows
  const listBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
  listBox.set_name('signalList');

  const scroll = new Gtk.ScrolledWindow({
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vexpand: true,
  });
  scroll.set_child(listBox);

  const root = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
  root.append(header);
  root.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));
  root.append(colHeader);
  root.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));
  root.append(scroll);

  // ─── Row Management ──────────────────────────────────────────────────────────

  function makeRow(name) {
    const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
    row.set_margin_start(8);
    row.set_margin_end(8);
    row.set_margin_top(2);
    row.set_margin_bottom(2);
    row.set_name('sigRow:' + name);

    const mkLbl = (text, width, css = '') => {
      const l = new Gtk.Label({ label: text });
      l.set_halign(Gtk.Align.START);
      l.set_size_request(width, -1);
      l.set_ellipsize(3); // PANGO_ELLIPSIZE_END
      l.set_selectable(true);
      if (css) l.add_css_class(css);
      return l;
    };

    const nameLbl = mkLbl(name, 120, 'monospace');
    const valueLbl = mkLbl('—', 160, 'monospace');
    const prevLbl = mkLbl('—', 120, 'dim-label');
    const countLbl = mkLbl('0', 70, 'dim-label');
    const timeLbl = mkLbl('—', 80, 'dim-label');

    row.append(nameLbl);
    row.append(valueLbl);
    row.append(prevLbl);
    row.append(countLbl);
    row.append(timeLbl);

    return { row, nameLbl, valueLbl, prevLbl, countLbl, timeLbl };
  }

  function formatValue(val) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'object') {
      try {
        const s = JSON.stringify(val);
        return s.length > 40 ? s.slice(0, 37) + '…' : s;
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 1000) return diff + 'ms';
    if (diff < 60000) return (diff / 1000).toFixed(1) + 's';
    return (diff / 60000).toFixed(1) + 'm';
  }

  function updateRow(name, value, prev) {
    if (!signals.has(name)) {
      const widgets = makeRow(name);
      signals.set(name, { value, prev, count: 0, lastTime: Date.now(), ...widgets });
      listBox.append(widgets.row);
    }

    const entry = signals.get(name);
    entry.prev = entry.value;
    entry.value = value;
    entry.count++;
    entry.lastTime = Date.now();

    entry.valueLbl.set_label(formatValue(value));
    entry.prevLbl.set_label(formatValue(entry.prev));
    entry.countLbl.set_label(String(entry.count));
    entry.timeLbl.set_label('just now');

    // Flash highlight
    entry.row.add_css_class('suggested-action');
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
      entry.row.remove_css_class('suggested-action');
      return GLib.SOURCE_REMOVE;
    });
  }

  // Refresh time labels every second
  GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
    for (const [, entry] of signals) {
      entry.timeLbl.set_label(timeAgo(entry.lastTime));
    }
    return GLib.SOURCE_CONTINUE;
  });

  // ─── Bridge Events ───────────────────────────────────────────────────────────

  bridge.on('signal', msg => {
    updateRow(msg.name, msg.value, msg.prev);
  });

  bridge.on('disconnected', () => {
    // Keep values but dim them
    for (const [, entry] of signals) {
      entry.row.add_css_class('dim-label');
    }
  });

  // ─── Actions ─────────────────────────────────────────────────────────────────

  btnClear.connect('clicked', () => {
    let child = listBox.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      listBox.remove(child);
      child = next;
    }
    signals.clear();
  });

  return root;
}
