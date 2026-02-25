import { Gtk, Gdk, GLib } from './deps.ts';
import { createDialog } from './dialog.ts';
import * as deps from './extensions.ts';
import { self } from './elements.ts';

import type {
  DialogProps, DialogWindow, CallbackUse, CallbackDeps, WindowProps, WindowContext,
} from './main.ts';

type WidgetCallback = (p: CallbackDeps, o: object) => any;

export { Gtk, Gdk, Gio, GLib, Soup, GObject } from './deps.ts';
export * from './elements.ts';


export function use(callback: CallbackUse, props = {}) {
  return callback(deps, props);
}

export function createWidget(callback: WidgetCallback) {
  return (opts: object) => callback(deps, opts) as DialogWindow;
}

export function createWindow(props: WindowProps = {}) {
  const { loop, title, width, height, stylesheets, fullscreen, maximize, onClose, ...defaults } = props;

  Gtk.init();

  const main = loop || GLib.MainLoop.new(null, false);
  const win = new Gtk.ApplicationWindow({
    ...defaults,
    title: title || 'Untitled',
    default_width: width || 300,
    default_height: height || 250,
  });

  function close() {
    if (!onClose?.()) main.quit();
  }

  function open(callback: CallbackUse) {
    win.set_child(use(callback) as any);
    if (fullscreen) win.fullscreen();
    if (maximize) win.maximize();
    win.present();
    main.run();
    return win;
  }

  const provider = new Gtk.CssProvider();
  const display = Gdk.Display.get_default();

  stylesheets?.forEach(stylesheet => {
    if (stylesheet && GLib.file_test(stylesheet, GLib.FileTest.EXISTS)) {
      provider.load_from_path(stylesheet);

      Gtk.StyleContext.add_provider_for_display(
        display,
        provider,
        Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
      );
    }
  });

  const controller = new Gtk.ShortcutController();
  controller.set_scope(Gtk.ShortcutScope.LOCAL);
  controller.add_shortcut(new Gtk.Shortcut({
    trigger: Gtk.ShortcutTrigger.parse_string('<Meta>Q'),
    // @ts-expect-error
    action: Gtk.CallbackAction.new(close),
  }));

  win.add_controller(controller);
  win.connect('close-request', close);

  const dialog = (p: DialogProps) => createDialog({ ...p, win });

  return { dialog, close, open, self, win } as WindowContext;
}

export function createApplication(props: WindowProps, callback: (w: WindowContext) => void) {
  Gtk.init();

  const { name, flags, ...defaults } = props;

  const application = new Gtk.Application({
    application_id: name || 'org.example.Gtk4App',
    flags: flags || 0,
  });

  application.connect('activate', () => {
    const run = () => null;
    const quit = () => application.quit();

    callback(createWindow({ ...defaults, loop: { run, quit }, application }));
  });
  application.run(null);
}
