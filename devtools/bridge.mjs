/**
 * DevTools Bridge Server — runs inside DEVTOOLS process
 *
 * Listens on a Unix socket for target app connections.
 * Dispatches incoming messages to registered handlers.
 * Provides send(cmd) to push commands to target.
 */

import { Gio, GLib } from '../dist/gtk.mjs';

const SOCKET_PATH = '/tmp/jamrock-devtools.sock';

export class DevToolsBridge {
  #service = null;
  #connection = null;
  #out = null;
  #handlers = new Map();
  #cmdQueue = [];
  #nextId = 1;

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  start() {
    // Remove stale socket
    try {
      Gio.File.new_for_path(SOCKET_PATH).delete(null);
    } catch { /* doesn't exist */ }

    const addr = Gio.UnixSocketAddress.new(SOCKET_PATH);
    this.#service = new Gio.SocketService();
    this.#service.add_address(addr, Gio.SocketType.STREAM, Gio.SocketProtocol.DEFAULT, null);

    this.#service.connect('incoming', (_service, conn) => {
      this.#onConnection(conn);
    });

    this.#service.start();
    print('[bridge] Listening on ' + SOCKET_PATH);
  }

  stop() {
    this.#service?.stop();
    this.#connection = null;
    this.#out = null;
    try {
      Gio.File.new_for_path(SOCKET_PATH).delete(null);
    } catch { /* ignore */ }
  }

  get connected() {
    return this.#connection !== null;
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  on(type, handler) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, []);
    this.#handlers.get(type).push(handler);
    return () => {
      const list = this.#handlers.get(type);
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  // ─── Sending Commands ──────────────────────────────────────────────────────

  send(cmd) {
    if (!this.#out) {
      this.#cmdQueue.push(cmd);
      return Promise.resolve(null);
    }
    return this.#sendNow(cmd);
  }

  #sendNow(cmd) {
    return new Promise(resolve => {
      const id = this.#nextId++;
      const msg = { ...cmd, id };

      // Wait for result
      const unsub = this.on('result', (data) => {
        if (data.id === id) {
          unsub();
          resolve(data);
        }
      });

      try {
        const line = JSON.stringify(msg) + '\n';
        this.#out.put_string(line, null);
      } catch (e) {
        unsub();
        resolve({ ok: false, error: e.message });
      }
    });
  }

  // Convenience shortcuts
  click(widget) { return this.send({ cmd: 'click', widget }); }
  emit(widget, signal, ...args) { return this.send({ cmd: 'emit', widget, signal, args }); }
  setText(widget, value) { return this.send({ cmd: 'set_text', widget, value }); }
  setValue(widget, value) { return this.send({ cmd: 'set_value', widget, value }); }
  setSignal(name, value) { return this.send({ cmd: 'set_signal', name, value }); }
  snapshot() { return this.send({ cmd: 'snapshot' }); }
  highlight(widget, duration = 1500) { return this.send({ cmd: 'highlight', widget, duration }); }
  eval(code) { return this.send({ cmd: 'eval', code }); }

  // Local pause/resume — suspends handler dispatch without touching target
  #paused = false;
  #pauseQueue = [];

  pause() { this.#paused = true; }
  resume() {
    this.#paused = false;
    const queue = this.#pauseQueue.splice(0);
    for (const msg of queue) this.#dispatch(msg);
  }

  pauseTarget() { return this.send({ cmd: 'pause' }); }
  resumeTarget() { return this.send({ cmd: 'resume' }); }

  // ─── Connection Handling ───────────────────────────────────────────────────

  #onConnection(conn) {
    print('[bridge] Target connected');
    this.#connection = conn;

    const out = new Gio.DataOutputStream({ base_stream: conn.get_output_stream() });
    const inn = new Gio.DataInputStream({ base_stream: conn.get_input_stream() });
    this.#out = out;

    // Flush queued commands
    for (const cmd of this.#cmdQueue) this.#sendNow(cmd);
    this.#cmdQueue = [];

    this.#dispatch({ type: 'connected' });

    this.#readLoop(inn);
  }

  #readLoop(inn) {
    inn.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, res) => {
      try {
        const [line] = stream.read_line_finish_utf8(res);
        if (line) {
          const msg = JSON.parse(line);
          GLib.idle_add(300, () => {
            if (this.#paused) {
              this.#pauseQueue.push(msg);
            } else {
              this.#dispatch(msg);
            }
            return GLib.SOURCE_REMOVE;
          });
        }
        this.#readLoop(inn);
      } catch {
        print('[bridge] Target disconnected');
        this.#connection = null;
        this.#out = null;
        GLib.idle_add(300, () => {
          this.#dispatch({ type: 'disconnected' });
          return GLib.SOURCE_REMOVE;
        });
      }
    });
  }

  #dispatch(msg) {
    const handlers = this.#handlers.get(msg.type) ?? [];
    for (const h of handlers) h(msg);

    const all = this.#handlers.get('*') ?? [];
    for (const h of all) h(msg);
  }
}
