/**
 * DevTools Main Window
 *
 * Layout:
 *   ┌────────────────────────────────────────────────┐
 *   │  [Inspector] [Signals] [Events]   ● Connected  │  ← header
 *   ├────────────────────────────────────────────────┤
 *   │                                                │
 *   │           Active Panel                         │  ← content
 *   │                                                │
 *   ├────────────────────────────────────────────────┤
 *   │  ● button.gtk.mjs   [⟳ Reload]  [■ Stop]      │  ← statusbar
 *   └────────────────────────────────────────────────┘
 */

import { Gtk, Gdk, GLib } from '../../dist/gtk.mjs';
import { createInspectorPanel } from './inspector.mjs';
import { createSignalsPanel } from './signals.mjs';
import { createEventsPanel } from './events.mjs';

export function createDevToolsWindow(bridge, runner) {
  Gtk.init();

  const loop = GLib.MainLoop.new(null, false);
  const win = new Gtk.ApplicationWindow({
    title: 'Jamrock DevTools',
    default_width: 1200,
    default_height: 800,
  });

  // ─── CSS ────────────────────────────────────────────────────────────────────

  const css = new Gtk.CssProvider();
  css.load_from_string(`
    .devtools-highlight {
      outline: 3px solid #79C551;
      outline-offset: 2px;
    }
    .panel-tab {
      border-radius: 0;
      min-width: 90px;
    }
    .panel-tab:checked {
      background: alpha(@accent_bg_color, 0.2);
    }
    .status-connected { color: #79C551; }
    .status-disconnected { color: #DC3546; }
    .monospace { font-family: monospace; }
    .accent { color: @accent_color; }
    .success { color: #79C551; }
    .heading { font-weight: bold; font-size: 1.1em; }
  `);
  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    css,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
  );

  // ─── Header ─────────────────────────────────────────────────────────────────

  const header = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
  header.set_margin_start(8);
  header.set_margin_end(8);
  header.set_margin_top(6);
  header.set_margin_bottom(6);

  // Panel tabs
  const tabGroup = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 0 });
  tabGroup.add_css_class('linked');

  const tabs = [
    { id: 'inspector', label: 'Inspector' },
    { id: 'signals', label: 'Signals' },
    { id: 'events', label: 'Events' },
  ];

  let activeTab = 'inspector';
  const tabBtns = {};

  tabs.forEach(({ id, label }, i) => {
    const btn = new Gtk.ToggleButton({ label });
    btn.set_name('tab:' + id);
    btn.add_css_class('panel-tab');
    if (i === 0) btn.set_active(true);

    btn.connect('toggled', () => {
      if (btn.get_active()) {
        // Untoggle others
        for (const [tid, tbtn] of Object.entries(tabBtns)) {
          if (tid !== id) tbtn.set_active(false);
        }
        switchPanel(id);
      }
    });

    tabBtns[id] = btn;
    tabGroup.append(btn);
  });

  // Status indicator
  const statusBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
  statusBox.set_hexpand(true);
  statusBox.set_halign(Gtk.Align.END);

  const statusDot = new Gtk.Label({ label: '●' });
  statusDot.add_css_class('status-disconnected');
  statusDot.set_name('statusDot');

  const statusLbl = new Gtk.Label({ label: 'Disconnected' });
  statusLbl.set_name('statusLbl');

  statusBox.append(statusDot);
  statusBox.append(statusLbl);

  header.append(tabGroup);
  header.append(statusBox);

  // ─── Panels ──────────────────────────────────────────────────────────────────

  const inspectorPanel = createInspectorPanel(bridge);
  const signalsPanel = createSignalsPanel(bridge);
  const eventsPanel = createEventsPanel(bridge);

  const stack = new Gtk.Stack();
  stack.set_vexpand(true);
  stack.add_named(inspectorPanel, 'inspector');
  stack.add_named(signalsPanel, 'signals');
  stack.add_named(eventsPanel, 'events');

  function switchPanel(id) {
    activeTab = id;
    stack.set_visible_child_name(id);
  }

  // ─── Status Bar ──────────────────────────────────────────────────────────────

  const statusBar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
  statusBar.set_margin_start(8);
  statusBar.set_margin_end(8);
  statusBar.set_margin_top(4);
  statusBar.set_margin_bottom(4);

  const appPathLbl = new Gtk.Label({ label: 'No target' });
  appPathLbl.set_name('appPathLbl');
  appPathLbl.set_halign(Gtk.Align.START);
  appPathLbl.set_hexpand(true);
  appPathLbl.add_css_class('dim-label');
  appPathLbl.add_css_class('monospace');

  const btnReload = new Gtk.Button({ label: '⟳ Reload' });
  btnReload.set_name('btnReload');
  btnReload.add_css_class('flat');

  const btnStop = new Gtk.Button({ label: '■ Stop' });
  btnStop.set_name('btnStop');
  btnStop.add_css_class('flat');
  btnStop.add_css_class('destructive-action');

  statusBar.append(appPathLbl);
  statusBar.append(btnReload);
  statusBar.append(btnStop);

  // ─── Root Layout ─────────────────────────────────────────────────────────────

  const root = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
  root.append(header);
  root.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));
  root.append(stack);
  root.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));
  root.append(statusBar);

  win.set_child(root);

  // ─── Bridge Event Handlers ────────────────────────────────────────────────────

  bridge.on('connected', () => {
    statusDot.remove_css_class('status-disconnected');
    statusDot.add_css_class('status-connected');
    statusLbl.set_label('Connected');
  });

  bridge.on('disconnected', () => {
    statusDot.remove_css_class('status-connected');
    statusDot.add_css_class('status-disconnected');
    statusLbl.set_label('Disconnected');
  });

  // ─── Runner Event Handlers ────────────────────────────────────────────────────

  if (runner) {
    runner.on('start', ({ path }) => {
      const name = path.split('/').pop();
      appPathLbl.set_label('▶ ' + name);
    });

    runner.on('exit', ({ status }) => {
      appPathLbl.set_label('■ exited (' + status + ')');
    });

    runner.on('change', ({ file }) => {
      const name = file.split('/').pop();
      appPathLbl.set_label('⟳ reloading: ' + name + '…');
    });

    btnReload.connect('clicked', () => runner.restart());
    btnStop.connect('clicked', () => runner.stop());
  }

  // ─── Window Close ────────────────────────────────────────────────────────────

  win.connect('close-request', () => {
    runner?.stop();
    bridge.stop();
    loop.quit();
  });

  // Keyboard shortcuts
  const controller = new Gtk.ShortcutController();
  controller.set_scope(Gtk.ShortcutScope.LOCAL);
  controller.add_shortcut(new Gtk.Shortcut({
    trigger: Gtk.ShortcutTrigger.parse_string('<Meta>Q'),
    // @ts-expect-error
    action: Gtk.CallbackAction.new(() => {
      runner?.stop();
      bridge.stop();
      loop.quit();
    }),
  }));
  win.add_controller(controller);

  return {
    open() {
      win.present();
      loop.run();
    },
    close() {
      runner?.stop();
      bridge.stop();
      loop.quit();
    },
    win,
  };
}
