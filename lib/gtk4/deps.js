import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';

export const fs = {
  writeFileSync: (f, s) => print(JSON.stringify({ writeFileSync: [f, s] })),
  existsSync: s => print(JSON.stringify({ existsSync: s })),
  readdirSync: s => print(JSON.stringify({ readdirSync: s })),
  chmodSync: (s, c) => print(JSON.stringify({ chmodSync: [s, c] })),
  cpSync: (a, b) => print(JSON.stringify({ cpSync: [a, b] })),
};

export const path = {
  resolve: (base, ...args) => {
    // const currentFile = Gio.File.new_for_uri(base);
    // console.log(currentFile.resolve_relative_path(...args).get_path());
    // return '/tmp/noop';
  },
  dirname: base => {
    // const currentFile = Gio.File.new_for_uri('file://'+base.replace('file://'));
    // console.log(base, currentFile.get_parent().get_path())
    // console.log({ base });
    // return currentFile.get_parent().get_path();
  },
};



export const url = {
  fileURLToPath: () => '/tmp/noop',
};

export const glob = {};

export function serveStaticBun() { }
export function timingSafeEqual() { }

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
  if (Gtk.Window.get_default_root_window()) {
    Gtk.main_quit();
  }
  GLib.exit(exitCode);
}
