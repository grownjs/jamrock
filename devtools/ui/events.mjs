/**
 * Event Log Panel
 *
 * Real-time stream of widget events with pause/clear/filter.
 */

import { Gtk } from '../../dist/gtk.mjs';

const MAX_EVENTS = 500;

export function createEventsPanel(bridge) {
  let paused = false;
  let filter = '';
  const eventRows = [];

  // ─── Layout ─────────────────────────────────────────────────────────────────

  const toolbar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
  toolbar.set_margin_start(8);
  toolbar.set_margin_end(8);
  toolbar.set_margin_top(4);
  toolbar.set_margin_bottom(4);

  const btnPause = new Gtk.ToggleButton({ label: '⏸ Pause' });
  btnPause.add_css_class('flat');

  const btnClear = new Gtk.Button({ label: '🗑 Clear' });
  btnClear.add_css_class('flat');

  const filterEntry = new Gtk.Entry({ placeholder_text: 'Filter…' });
  filterEntry.set_hexpand(true);

  const countLbl = new Gtk.Label({ label: '0 events' });
  countLbl.add_css_class('dim-label');

  toolbar.append(btnPause);
  toolbar.append(btnClear);
  toolbar.append(filterEntry);
  toolbar.append(countLbl);

  // Column headers
  const colHeader = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
  colHeader.set_margin_start(8);
  colHeader.add_css_class('dim-label');
  colHeader.set_margin_end(8);

  const mkHdr = (text, w) => {
    const l = new Gtk.Label({ label: text });
    l.set_halign(Gtk.Align.START);
    l.set_size_request(w, -1);
    return l;
  };
  colHeader.append(mkHdr('Time', 70));
  colHeader.append(mkHdr('Widget', 120));
  colHeader.append(mkHdr('Event', 90));
  colHeader.append(mkHdr('Value', 200));

  // Event list
  const listBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
  listBox.set_name('eventList');

  const scroll = new Gtk.ScrolledWindow({
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vexpand: true,
  });
  scroll.set_child(listBox);

  const root = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
  root.append(toolbar);
  root.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));
  root.append(colHeader);
  root.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));
  root.append(scroll);

  // ─── Event Rendering ─────────────────────────────────────────────────────────

  function formatTime(ts) {
    const d = new Date(ts);
    return d.getHours().toString().padStart(2, '0') + ':' +
           d.getMinutes().toString().padStart(2, '0') + ':' +
           d.getSeconds().toString().padStart(2, '0') + '.' +
           d.getMilliseconds().toString().padStart(3, '0');
  }

  function formatEventValue(msg) {
    if (msg.kind === 'signal') return String(msg.value) + ' (prev: ' + String(msg.prev) + ')';
    if (msg.x !== undefined) return `x=${msg.x} y=${msg.y}`;
    if (msg.value !== undefined) return String(msg.value);
    return '—';
  }

  function matchesFilter(msg) {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (msg.widget ?? '').toLowerCase().includes(f) ||
           (msg.kind ?? '').toLowerCase().includes(f) ||
           (msg.name ?? '').toLowerCase().includes(f);
  }

  function addEvent(msg) {
    if (paused || !matchesFilter(msg)) return;

    const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
    row.set_margin_start(8);
    row.set_margin_end(8);
    row.set_name('evtRow');

    const mk = (text, w, ...classes) => {
      const l = new Gtk.Label({ label: text });
      l.set_halign(Gtk.Align.START);
      l.set_size_request(w, -1);
      l.set_ellipsize(3);
      for (const cls of classes) if (cls) l.add_css_class(cls);
      return l;
    };

    const kindCss = msg.kind === 'clicked' ? 'success' : msg.kind === 'signal' ? 'accent' : '';

    row.append(mk(formatTime(msg.time ?? Date.now()), 70, 'dim-label', 'monospace'));
    row.append(mk(msg.widget ?? msg.name ?? '—', 120, 'monospace'));
    row.append(mk(msg.kind ?? msg.type, 90, kindCss));
    row.append(mk(formatEventValue(msg), 200, 'dim-label'));

    listBox.append(row);
    eventRows.push(row);

    // Trim old events
    while (eventRows.length > MAX_EVENTS) {
      const old = eventRows.shift();
      listBox.remove(old);
    }

    // Auto-scroll to bottom
    const adj = scroll.get_vadjustment();
    adj.set_value(adj.get_upper() - adj.get_page_size());

    countLbl.set_label(eventRows.length + ' events');
  }

  // ─── Bridge Events ───────────────────────────────────────────────────────────

  bridge.on('event', addEvent);
  bridge.on('signal', msg => addEvent({ ...msg, kind: 'signal', widget: msg.name }));

  // ─── Actions ─────────────────────────────────────────────────────────────────

  btnPause.connect('toggled', () => {
    paused = btnPause.get_active();
    btnPause.set_label(paused ? '▶ Resume' : '⏸ Pause');
  });

  btnClear.connect('clicked', () => {
    for (const row of eventRows) listBox.remove(row);
    eventRows.length = 0;
    countLbl.set_label('0 events');
  });

  filterEntry.connect('changed', () => {
    filter = filterEntry.get_text();
  });

  return root;
}
