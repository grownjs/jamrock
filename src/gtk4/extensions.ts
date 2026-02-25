import { Gtk, Gdk, Gio, GLib, Soup, GObject } from './deps.ts';
import * as tags from './elements.ts';

export const BASE_DIR = GLib.get_current_dir();

export function deps() {
  return { ...tags, Gtk, Gdk, Gio, GLib, Soup, GObject, BASE_DIR };
}
