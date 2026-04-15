/**
 * DevTools Runner — launches target app as subprocess
 *
 * - Spawns app via gjs with bridge-agent injected
 * - Hot-reloads on file changes via Gio.FileMonitor
 * - Captures stdout/stderr and emits as log events
 */

import { Gio, GLib } from '../dist/gtk.mjs';

const GJS_BIN = 'gjs';
const LIB_PATH = '/opt/homebrew/lib';

export class AppRunner {
  #proc = null;
  #monitor = null;
  #appPath = null;
  #opts = {};
  #handlers = new Map();
  #restarting = false;
  #restartTimer = 0;

  constructor(appPath, opts = {}) {
    this.#appPath = appPath;
    this.#opts = opts;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  start() {
    this.#spawn();
    this.#watchFiles();
  }

  stop() {
    this.#killProc();
    this.#monitor?.cancel();
    this.#monitor = null;
    if (this.#restartTimer) {
      GLib.source_remove(this.#restartTimer);
      this.#restartTimer = 0;
    }
  }

  restart() {
    this.#killProc();
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
      this.#spawn();
      this.#restarting = false;
      return GLib.SOURCE_REMOVE;
    });
  }

  get running() {
    return this.#proc !== null;
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  on(event, handler) {
    if (!this.#handlers.has(event)) this.#handlers.set(event, []);
    this.#handlers.get(event).push(handler);
    return () => {
      const list = this.#handlers.get(event);
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  #emit(event, data) {
    for (const h of this.#handlers.get(event) ?? []) h(data);
  }

  // ─── Process ───────────────────────────────────────────────────────────────

  #spawn() {
    if (this.#proc) this.#killProc();

    try {
      const launcher = new Gio.SubprocessLauncher({
        flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE,
      });
      launcher.setenv('DYLD_LIBRARY_PATH', LIB_PATH, true);
      launcher.setenv('JAMROCK_DEVTOOLS', '1', true);
      if (this.#opts.headless) launcher.setenv('JAMROCK_HEADLESS', '1', true);
      this.#proc = launcher.spawnv([GJS_BIN, '-m', this.#appPath]);

      this.#emit('start', { pid: this.#proc.get_identifier(), path: this.#appPath });
      this.#readOutput();

      // Watch for exit
      const watchedProc = this.#proc;
      watchedProc.wait_async(null, (_proc, res) => {
        try {
          watchedProc.wait_finish(res);
        } catch { /* ignore */ }
        let status = 0;
        try { status = watchedProc.get_exit_status(); } catch { /* killed by signal */ }
        if (this.#proc === watchedProc) this.#proc = null;
        this.#emit('exit', { status, path: this.#appPath });
      });
    } catch (e) {
      this.#emit('error', { message: 'Failed to spawn: ' + e.message });
    }
  }

  #killProc() {
    if (!this.#proc) return;
    try {
      this.#proc.send_signal(15); // SIGTERM
    } catch { /* ignore */ }
    this.#proc = null;
  }

  #readOutput() {
    if (!this.#proc) return;
    const stream = new Gio.DataInputStream({
      base_stream: this.#proc.get_stdout_pipe(),
    });

    const readNext = () => {
      stream.read_line_async(GLib.PRIORITY_DEFAULT, null, (s, res) => {
        try {
          const [line] = s.read_line_finish_utf8(res);
          if (line !== null) {
            this.#emit('stdout', { line, path: this.#appPath });
            readNext();
          }
        } catch { /* process ended */ }
      });
    };

    readNext();
  }

  // ─── File Watching ─────────────────────────────────────────────────────────

  #watchFiles() {
    const appFile = Gio.File.new_for_path(this.#appPath);
    const appDir = appFile.get_parent();

    // Watch the app directory for any .mjs or .html changes
    this.#monitor = appDir.monitor_directory(Gio.FileMonitorFlags.NONE, null);

    this.#monitor.connect('changed', (_mon, file, _other, eventType) => {
      if (eventType !== Gio.FileMonitorEvent.CHANGES_DONE_HINT) return;

      const name = file.get_basename();
      if (!name.endsWith('.mjs') && !name.endsWith('.html')) return;

      this.#emit('change', { file: file.get_path() });

      // Debounce restart
      if (this.#restartTimer) GLib.source_remove(this.#restartTimer);
      this.#restartTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
        this.#restartTimer = 0;
        this.restart();
        return GLib.SOURCE_REMOVE;
      });
    });
  }
}
