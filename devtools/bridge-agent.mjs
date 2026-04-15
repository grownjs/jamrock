/**
 * DevTools Bridge Agent — runs inside the TARGET app
 *
 * Usage:
 *   import { attachDevTools } from '../devtools/bridge-agent.mjs';
 *   const { open, close, win } = createWindow(...);
 *   open(() => ...);
 *   attachDevTools(win, { signals });  // signals = map of name → signal
 */

import { Gio, GLib, Gtk } from '../dist/gtk.mjs';

const SOCKET_PATH = '/tmp/jamrock-devtools.sock';
const RECONNECT_MS = 1000;

// ─── Widget Tree ─────────────────────────────────────────────────────────────

function serializeWidget(widget, win, depth = 0) {
  if (!widget) return null;

  const alloc = widget.get_allocation();
  const name = widget.get_name?.() ?? '';
  const type = widget.constructor.name.replace(/^Gtk_/, '');

  let x = null;
  let y = null;
  if (win) {
    const [ok, wx, wy] = widget.translate_coordinates(win, 0, 0);
    if (ok) { x = Math.round(wx); y = Math.round(wy); }
  }

  const node = {
    name,
    type,
    x,
    y,
    width: alloc.width,
    height: alloc.height,
    visible: widget.is_visible?.() ?? null,
    sensitive: widget.get_sensitive?.() ?? null,
    children: [],
  };

  let child = widget.get_first_child?.();
  while (child) {
    const serialized = serializeWidget(child, win, depth + 1);
    if (serialized) node.children.push(serialized);
    child = child.get_next_sibling?.();
  }

  return node;
}

// ─── Command Execution ───────────────────────────────────────────────────────

function findWidget(widget, name) {
  if (widget.get_name?.() === name) return widget;
  let child = widget.get_first_child?.();
  while (child) {
    const found = findWidget(child, name);
    if (found) return found;
    child = child.get_next_sibling?.();
  }
  return null;
}

function execCommand(cmd, win, registeredSignals) {
  try {
    switch (cmd.cmd) {
      case 'click': {
        const w = findWidget(win, cmd.widget);
        if (w) w.emit('clicked');
        return { ok: true };
      }
      case 'activate': {
        const w = findWidget(win, cmd.widget);
        if (w) w.activate?.();
        return { ok: true };
      }
      case 'emit': {
        const w = findWidget(win, cmd.widget);
        if (w) w.emit(cmd.signal, ...(cmd.args ?? []));
        return { ok: true };
      }
      case 'set_text': {
        const w = findWidget(win, cmd.widget);
        if (w?.set_text) w.set_text(cmd.value);
        else if (w?.get_buffer) {
          const buf = w.get_buffer();
          buf.set_text(cmd.value, cmd.value.length);
        }
        return { ok: true };
      }
      case 'set_value': {
        const w = findWidget(win, cmd.widget);
        if (w?.set_value) w.set_value(cmd.value);
        else if (w?.set_active !== undefined) w.set_active(cmd.value);
        return { ok: true };
      }
      case 'set_signal': {
        const sig = registeredSignals?.[cmd.name];
        if (sig) sig.value = cmd.value;
        return { ok: true };
      }
      case 'snapshot':
        return { ok: true, tree: serializeWidget(win, win) };
      case 'highlight': {
        const w = findWidget(win, cmd.widget);
        if (w) {
          w.add_css_class('devtools-highlight');
          GLib.timeout_add(GLib.PRIORITY_DEFAULT, cmd.duration ?? 1500, () => {
            w.remove_css_class('devtools-highlight');
            return GLib.SOURCE_REMOVE;
          });
        }
        return { ok: true };
      }
      case 'pick_mode': {
        // TODO: Phase 2
        return { ok: true };
      }
      default:
        return { ok: false, error: 'Unknown command: ' + cmd.cmd };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Connection ──────────────────────────────────────────────────────────────

function createConnection(win, registeredSignals, onReady) {
  const client = new Gio.SocketClient();
  const addr = Gio.UnixSocketAddress.new(SOCKET_PATH);

  try {
    const conn = client.connect(addr, null);
    const out = new Gio.DataOutputStream({ base_stream: conn.get_output_stream() });
    const inn = new Gio.DataInputStream({ base_stream: conn.get_input_stream() });

    function send(msg) {
      try {
        const line = JSON.stringify(msg) + '\n';
        out.put_string(line, null);
      } catch {
        // connection dropped
      }
    }

    // Send ready + initial tree
    send({ type: 'ready', pid: GLib.getpid?.() ?? 0 });
    send({ type: 'tree', tree: serializeWidget(win, win) });

    onReady?.(send);

    // Read commands in a loop
    function readNext() {
      inn.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, res) => {
        try {
          const [line] = stream.read_line_finish_utf8(res);
          if (line) {
            const cmd = JSON.parse(line);
            const result = execCommand(cmd, win, registeredSignals);
            send({ type: 'result', id: cmd.id, ...result });

            // After any command, send updated tree
            if (cmd.cmd !== 'snapshot') {
              send({ type: 'tree', tree: serializeWidget(win, win) });
            }
          }
          readNext();
        } catch {
          // connection closed
        }
      });
    }

    readNext();
    return send;
  } catch {
    return null;
  }
}

// ─── Signal Proxying ─────────────────────────────────────────────────────────

function proxySignals(signals, send) {
  if (!signals || !send) return;

  for (const [name, sig] of Object.entries(signals)) {
    const original = Object.getOwnPropertyDescriptor(sig, 'value');
    if (!original) continue;

    let prev = sig.peek?.() ?? sig.value;

    // Wrap subscribe to forward to devtools
    sig.subscribe(newVal => {
      send({ type: 'signal', name, value: newVal, prev });
      prev = newVal;
    });
  }
}

// ─── Event Forwarding ────────────────────────────────────────────────────────

function proxyEvents(win, send) {
  if (!win || !send) return;

  function attachTracking(widget) {
    const name = widget.get_name?.() ?? '';
    const type = widget.constructor.name.replace(/^Gtk_/, '');

    // clicked signal (fires on both real and programmatic clicks)
    if (typeof widget.connect === 'function') {
      try {
        widget.connect('clicked', () => {
          send({ type: 'event', kind: 'clicked', widget: name, widgetType: type, time: Date.now() });
        });
      } catch { /* not all widgets have clicked */ }
    }

    // GestureClick for precise x,y on real mouse clicks
    const gesture = Gtk.GestureClick.new();
    gesture.connect('pressed', (_, _n, x, y) => {
      send({ type: 'event', kind: 'pressed', widget: name, widgetType: type, x: Math.round(x), y: Math.round(y), time: Date.now() });
    });
    widget.add_controller(gesture);

    // Motion enter/leave
    const motion = new Gtk.EventControllerMotion();
    motion.connect('enter', () => {
      send({ type: 'event', kind: 'enter', widget: name, widgetType: type, time: Date.now() });
    });
    motion.connect('leave', () => {
      send({ type: 'event', kind: 'leave', widget: name, widgetType: type, time: Date.now() });
    });
    widget.add_controller(motion);

    let child = widget.get_first_child?.();
    while (child) {
      attachTracking(child);
      child = child.get_next_sibling?.();
    }
  }

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
    attachTracking(win);
    return GLib.SOURCE_REMOVE;
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Attach DevTools bridge to a running app window.
 *
 * @param {Gtk.Window} win    - The app's root window
 * @param {object}     opts
 * @param {object}     [opts.signals]   - Map of name → signal() for the signal tracker
 * @param {boolean}    [opts.events]    - Whether to forward motion/click events (default: true)
 */
export function attachDevTools(win, { signals = {}, events = true } = {}) {
  let send = null;
  let eventsAttached = false;

  function connect() {
    // Socket must exist first
    if (!GLib.file_test(SOCKET_PATH, GLib.FileTest.EXISTS)) {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, RECONNECT_MS, () => {
        connect();
        return GLib.SOURCE_REMOVE;
      });
      return;
    }

    send = createConnection(win, signals, s => {
      if (events && !eventsAttached) {
        proxyEvents(win, s);
        eventsAttached = true;
      }
      proxySignals(signals, s);
    });

    if (!send) {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, RECONNECT_MS, () => {
        connect();
        return GLib.SOURCE_REMOVE;
      });
    }
  }

  // Small delay so window is realized before first tree snapshot
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
    connect();
    return GLib.SOURCE_REMOVE;
  });

  // Periodic tree snapshots
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
    if (send) send({ type: 'tree', tree: serializeWidget(win, win) });
    return GLib.SOURCE_CONTINUE;
  });
}
