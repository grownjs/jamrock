import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';


export const fs = {
  writeFileSync: (f, s) => print(JSON.stringify({ writeFileSync: [f, s] })),
  existsSync: f => GLib.file_test(f, GLib.FileTest.EXISTS),
  statSync: f => ({ isFile: () => false }),
  readdirSync: s => print(JSON.stringify({ readdirSync: s })),
  chmodSync: (s, c) => print(JSON.stringify({ chmodSync: [s, c] })),
  cpSync: (a, b) => print(JSON.stringify({ cpSync: [a, b] })),
};

export const url = {
  fileURLToPath: f => f.replace('file://', ''),
};

export const path = {};

export const glob = {};

export function serveStaticBun() { }
export function timingSafeEqual() { }

export function getCwd() {
  return GLib.get_current_dir();
}

export function loadEnv() {
  const env = {};
  for (const envString of GLib.get_environ()) {
    const parts = envString.split('=');
    if (parts.length > 1) {
      const key = parts[0];
      const value = parts.slice(1).join('=');
      env[key] = value;
    }
  }
  return env;
}

export function getVersion() {
  const major = Gtk.get_major_version();
  const minor = Gtk.get_minor_version();
  const micro = Gtk.get_micro_version();
  return [major, minor, micro].join('.');
}

export function exitProgram(exitCode) {
  try {
    if (Gtk.Window.get_default_root_window?.()) {
      Gtk.main_quit();
    }
    GLib.exit?.(exitCode);
  } catch (e) {
    logError(e);
  }
}
