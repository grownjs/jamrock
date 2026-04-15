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
  #handlers = new Map();
  #restarting = false;
  #restartTimer = 0;

  constructor(appPath) {
    this.#appPath = appPath;
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

    const appFile = Gio.File.new_for_path(this.#appPath);
    const appDir = appFile.get_parent().get_path();
    const injectedSrc = this.#buildInjectedSource(this.#appPath);

    // Write injected source to tmp file
    const tmpPath = '/tmp/jamrock-devtools-target.mjs';
    try {
      Gio.File.new_for_path(tmpPath).replace_contents(
        new TextEncoder().encode(injectedSrc),
        null, false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
      );
    } catch (e) {
      this.#emit('error', { message: 'Failed to write tmp file: ' + e.message });
      return;
    }

    const env = [
      ...GLib.get_environ(),
      'DYLD_LIBRARY_PATH=' + LIB_PATH,
      'JAMROCK_DEVTOOLS=1',
    ];

    try {
      const launcher = new Gio.SubprocessLauncher({
        flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE,
      });
      launcher.setenv('DYLD_LIBRARY_PATH', LIB_PATH, true);
      launcher.setenv('JAMROCK_DEVTOOLS', '1', true);
      this.#proc = launcher.spawnv([GJS_BIN, '-m', tmpPath]);

      this.#emit('start', { pid: this.#proc.get_identifier(), path: this.#appPath });
      this.#readOutput();

      // Watch for exit
      this.#proc.wait_async(null, (_proc, res) => {
        try {
          this.#proc.wait_finish(res);
        } catch { /* ignore */ }
        const status = this.#proc.get_exit_status();
        this.#proc = null;
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

  // ─── Source Injection ──────────────────────────────────────────────────────

  #buildInjectedSource(appPath) {
    // Absolute path for the devtools module
    const cwd = GLib.get_current_dir();

    return `
// === DevTools Injected Wrapper ===
import { attachDevTools } from '${cwd}/devtools/bridge-agent.mjs';

// Import the original app — but we need to intercept createWindow
// We do this by patching after open() is called.
// The app must call open(); we wrap it.

const _origImport = '${appPath}';

// Patch: re-export createWindow with devtools hook
import { createWindow as _createWindow } from '${cwd}/dist/gtk.mjs';

let _win = null;
let _close = null;

const createWindow = (props) => {
  const ctx = _createWindow(props);
  const _origOpen = ctx.open;
  ctx.open = (cb) => {
    const result = _origOpen(cb);
    _win = ctx.win;
    // Attach devtools after open
    attachDevTools(_win);
    return result;
  };
  return ctx;
};

// Inject createWindow override into module scope via dynamic import
// The target app is re-executed with the patched createWindow
const mod = await import('${appPath}');
`;
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
