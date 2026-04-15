/* eslint-disable no-use-before-define */

import type { Gtk, Gdk, Gio, GLib, Soup, GObject } from './deps.ts';

import * as Elements from './elements.ts';

export type GtkAndConfig = {
  Gtk: typeof Gtk;
  Gdk: typeof Gdk;
  Gio: typeof Gio;
  GLib: typeof GLib;
  Soup: typeof Soup;
  GObject: typeof GObject;
  BASE_UNIT: number;
};

export type GtkEvent = 'toggled' | 'selected' | 'modified' | 'activated';

export type GtkChange = {
  toggled?: boolean;
  type: GtkEvent;
  value: any;
};

export type GtkObject = GObject.Object;

export interface GtkWidget extends Gtk.Widget {
  get_model: () => any;
  set_label: (s: string) => void;
  set_text: (s: string) => void;
  set_fraction: (n: number) => void;
  scroll_to: (a: any, b: any, c: any) => void;
}

export type GtkWidgets = (GtkWidget | null)[];

export type SizingRule = 'mt' | 'mb' | 'ms' | 'me' | 'm' | 'sp' | 'sp' | 'hx' | 'vx' | 'va' | 'ha' | 'mx' | 'my' | 'bo' | 'w' | 'h' | 'o';
export type SizingValue = (v: string | number, p: SizingValueDeps) => SizingResult;

// @ts-expect-error
export type SizingResult = Record<string, string | number | SizingResult>;

export type SizingValues = Record<SizingRule, SizingValue>;
export type SizingValueDeps = Partial<SizingValues> & GtkAndConfig;

export type SelfContext = Record<string, GtkWidget>;

export type AfterCallback = (el: GtkWidget, p: SizingValueDeps) => void;

export type ElementFactory = (p: SizingValueDeps, o: any) => GtkWidget;
export type ElementProps = {
  [key: string]: any;
  disabled?: boolean;
  className?: string;
  onOff?: (el: GtkWidget, o: GtkObject) => void;
  onBind?: (el: GtkWidget, o: GtkObject) => void;
  onChange?: (e: GtkChange) => void;
  onToggle?: (x: boolean) => void;
  onClick?: Function;
  name?: string;
};

export type CallbackDeps = Omit<GtkAndConfig, 'BASE_UNIT'> & typeof Elements;
export type CallbackUse = (p: CallbackDeps, o: any) => GtkWidget;

export type SpawnOptions = {
  onClose?: (p: Gio.Subprocess) => void;
  onInput?: (s: string) => boolean | undefined;
  onFinish?: (p: { success: boolean; stdout: string | null; stderr: string | null }) => void;
};

export type DialogProps = {
  message?: string;
  caption?: string;
  detail?: string;
  title?: string;
  win?: Gtk.Window | null;
};

export type DialogWindow = Gtk.Window;

export type WindowContext = {
  dialog: (p: DialogProps) => DialogWindow;
  close: () => void;
  open: (f: CallbackUse) => void;
  self: typeof Elements.self;
  win: Gtk.Window;
};

export type WindowProps = {
  loop?: { run: () => void; quit: () => void };
  name?: string;
  flags?: number;
  title?: string;
  width?: number;
  height?: number;
  onClose?: () => boolean;
  maximize?: boolean;
  minimize?: boolean;
  fullscreen?: boolean;
  decorated?: boolean;
  deletable?: boolean;
  resizable?: boolean;
  modal?: boolean;
  transientFor?: Gtk.Window;
  stylesheets?: string[];
  application?: Gtk.Application;
};
