/**
 * Widget Inspector Panel
 *
 * Left column: tree list (scrollable)
 * Right column: properties for selected widget
 */

import { Gtk, GLib } from '../../dist/gtk.mjs';
import { flattenTree, findInTree, formatTree } from '../lib/tree.mjs';

export function createInspectorPanel(bridge) {
  // ─── State ──────────────────────────────────────────────────────────────────

  let currentTree = null;
  let selectedName = null;
  const rowMap = new Map(); // name+depth → Gtk.Label (tree row)

  // ─── Layout ─────────────────────────────────────────────────────────────────

  // Tree list (left)
  const treeBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
  treeBox.set_name('treeBox');

  const treeScroll = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    hexpand: false,
    vexpand: true,
  });
  treeScroll.set_size_request(280, -1);
  treeScroll.set_child(treeBox);

  // Properties (right)
  const propsBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
  propsBox.set_name('propsBox');
  propsBox.set_margin_start(8);
  propsBox.set_margin_end(8);
  propsBox.set_margin_top(8);

  const propsScroll = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    hexpand: true,
    vexpand: true,
  });
  propsScroll.set_child(propsBox);

  // Action bar (at bottom of props)
  const actionBar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
  actionBar.set_margin_top(8);

  const btnClick = new Gtk.Button({ label: 'Click' });
  const btnHighlight = new Gtk.Button({ label: 'Highlight' });
  const btnRefresh = new Gtk.Button({ label: 'Refresh' });

  btnClick.set_name('btnClick');
  btnHighlight.set_name('btnHighlight');
  btnRefresh.set_name('btnRefresh');

  actionBar.append(btnClick);
  actionBar.append(btnHighlight);
  actionBar.append(btnRefresh);

  // Main split
  const paned = new Gtk.Paned({ orientation: Gtk.Orientation.HORIZONTAL });
  paned.set_start_child(treeScroll);
  paned.set_end_child(propsScroll);
  paned.set_position(280);
  paned.set_vexpand(true);

  // ─── Tree Rendering ──────────────────────────────────────────────────────────

  function renderTree(tree) {
    // Clear existing rows
    let child = treeBox.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      treeBox.remove(child);
      child = next;
    }
    rowMap.clear();

    if (!tree) return;

    const entries = flattenTree(tree);
    for (const { node, depth } of entries) {
      // Skip internal GTK tooltip window
      if (node.type === 'unknown_GtkTooltipWindow') continue;

      const key = (node.name || node.type) + ':' + depth;
      const indent = '  '.repeat(depth);
      const label = node.name
        ? `${indent}${node.name} (${node.type})`
        : `${indent}${node.type}`;

      const row = new Gtk.Button({ label });
      row.set_name('treeRow:' + (node.name || ''));
      row.add_css_class('flat');
      row.set_hexpand(true);

      if (node.name === selectedName) {
        row.add_css_class('suggested-action');
      }

      row.connect('clicked', () => selectWidget(node.name || null, node));
      treeBox.append(row);
      rowMap.set(key, row);
    }
  }

  // ─── Properties Rendering ────────────────────────────────────────────────────

  function renderProps(node) {
    // Clear
    let child = propsBox.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      propsBox.remove(child);
      child = next;
    }

    if (!node) {
      const empty = new Gtk.Label({ label: 'Select a widget to inspect' });
      empty.set_halign(Gtk.Align.START);
      empty.add_css_class('dim-label');
      propsBox.append(empty);
      propsBox.append(actionBar);
      return;
    }

    // Title
    const title = new Gtk.Label({ label: `${node.name || '(unnamed)'} — ${node.type}` });
    title.set_halign(Gtk.Align.START);
    title.add_css_class('heading');
    propsBox.append(title);

    propsBox.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));

    const props = [
      ['name', node.name || '(none)'],
      ['type', node.type],
      ['visible', String(node.visible ?? '—')],
      ['sensitive', String(node.sensitive ?? '—')],
      ['x', node.x !== null ? String(node.x) : '—'],
      ['y', node.y !== null ? String(node.y) : '—'],
      ['width', node.width !== undefined ? String(node.width) : '—'],
      ['height', node.height !== undefined ? String(node.height) : '—'],
    ];

    for (const [key, val] of props) {
      const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });

      const keyLbl = new Gtk.Label({ label: key });
      keyLbl.set_halign(Gtk.Align.START);
      keyLbl.set_size_request(80, -1);
      keyLbl.add_css_class('dim-label');

      const valLbl = new Gtk.Label({ label: val });
      valLbl.set_halign(Gtk.Align.START);
      valLbl.set_hexpand(true);
      valLbl.set_selectable(true);

      row.append(keyLbl);
      row.append(valLbl);
      propsBox.append(row);
    }

    propsBox.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));
    propsBox.append(actionBar);
  }

  // ─── Selection ───────────────────────────────────────────────────────────────

  function selectWidget(name, node) {
    selectedName = name;
    renderTree(currentTree); // re-render to update highlight
    renderProps(node ?? (name ? findInTree(currentTree, name) : null));
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  btnClick.connect('clicked', () => {
    if (selectedName) bridge.click(selectedName);
  });

  btnHighlight.connect('clicked', () => {
    if (selectedName) bridge.highlight(selectedName, 1500);
  });

  btnRefresh.connect('clicked', () => {
    bridge.snapshot().then(r => {
      if (r?.tree) {
        currentTree = r.tree;
        renderTree(currentTree);
      }
    });
  });

  // ─── Bridge Events ───────────────────────────────────────────────────────────

  let lastTreeSignature = '';
  let renderPending = false;

  bridge.on('tree', msg => {
    // Throttle: only re-render if tree structure changed
    const sig = formatTree(msg.tree);
    if (sig === lastTreeSignature) return;
    lastTreeSignature = sig;
    currentTree = msg.tree;

    // Defer to next GLib idle to avoid races with GTK layout
    if (!renderPending) {
      renderPending = true;
      GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        renderPending = false;
        renderTree(currentTree);
        if (selectedName) {
          const node = findInTree(currentTree, selectedName);
          renderProps(node);
        }
        return GLib.SOURCE_REMOVE;
      });
    }
  });

  bridge.on('disconnected', () => {
    currentTree = null;
    renderTree(null);
    renderProps(null);
  });

  // Initial render
  renderProps(null);

  return paned;
}
