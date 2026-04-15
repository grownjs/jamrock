/**
 * Console REPL Panel
 *
 * Live eval in the target app's context via bridge.eval().
 * History navigation with up/down arrows.
 */

import { Gtk, GLib } from '../../dist/gtk.mjs';

const PROMPT = '> ';
const MAX_OUTPUT = 200;

export function createConsolePanel(bridge) {
  const history = [];
  let historyIdx = -1;
  const outputLines = [];

  // ─── Layout ─────────────────────────────────────────────────────────────────

  const output = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
  output.set_name('consoleOutput');

  const scroll = new Gtk.ScrolledWindow({
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vexpand: true,
  });
  scroll.set_child(output);

  // Input row
  const inputRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
  inputRow.set_margin_start(8);
  inputRow.set_margin_end(8);
  inputRow.set_margin_top(4);
  inputRow.set_margin_bottom(4);

  const promptLbl = new Gtk.Label({ label: PROMPT });
  promptLbl.add_css_class('monospace');
  promptLbl.add_css_class('accent');

  const inputEntry = new Gtk.Entry();
  inputEntry.set_name('consoleInput');
  inputEntry.set_hexpand(true);
  inputEntry.add_css_class('monospace');
  inputEntry.set_placeholder_text('Evaluate JavaScript in app context…');

  const btnRun = new Gtk.Button({ label: 'Run' });
  btnRun.set_name('btnRun');
  btnRun.add_css_class('suggested-action');

  const btnClear = new Gtk.Button({ label: 'Clear' });
  btnClear.set_name('btnClearConsole');
  btnClear.add_css_class('flat');

  inputRow.append(promptLbl);
  inputRow.append(inputEntry);
  inputRow.append(btnRun);
  inputRow.append(btnClear);

  // Quick-action chips
  const chipsRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
  chipsRow.set_margin_start(8);
  chipsRow.set_margin_top(4);

  const quickActions = [
    ['Tree', 'return win ? win.get_name() : "no window"'],
    ['List Widgets', 'const r = []; function w(n,d){r.push("  ".repeat(d)+(n.get_name()||n.constructor.name.replace("Gtk_",""))); let c=n.get_first_child?.(); while(c){w(c,d+1);c=c.get_next_sibling?.();}} w(win,0); return r.join("\\n")'],
    ['Click btnA', 'const w = findWidget(win, "btnIncrement"); w?.emit("clicked"); return "clicked"'],
    ['Signals', 'return Object.keys(signals).join(", ")'],
  ];

  for (const [label, code] of quickActions) {
    const chip = new Gtk.Button({ label });
    chip.add_css_class('flat');
    chip.connect('clicked', () => {
      inputEntry.set_text(code);
      runCode(code);
    });
    chipsRow.append(chip);
  }

  const root = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
  root.append(scroll);
  root.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));
  root.append(chipsRow);
  root.append(inputRow);

  // ─── Output Helpers ──────────────────────────────────────────────────────────

  function addLine(text, css = '') {
    const lbl = new Gtk.Label({ label: text });
    lbl.set_halign(Gtk.Align.START);
    lbl.set_selectable(true);
    lbl.add_css_class('monospace');
    if (css) lbl.add_css_class(css);
    lbl.set_xalign(0);

    output.append(lbl);
    outputLines.push(lbl);

    // Trim old lines
    while (outputLines.length > MAX_OUTPUT) {
      const old = outputLines.shift();
      output.remove(old);
    }

    // Auto-scroll
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
      const adj = scroll.get_vadjustment();
      adj.set_value(adj.get_upper() - adj.get_page_size());
      return GLib.SOURCE_REMOVE;
    });
  }

  function addPrompt(code) {
    addLine(PROMPT + code, 'accent');
  }

  function addResult(value) {
    if (value === undefined) return;
    const text = typeof value === 'object' && value !== null
      ? JSON.stringify(value, null, 2)
      : String(value);
    // Multi-line results
    for (const line of text.split('\n')) {
      addLine('← ' + line, 'dim-label');
    }
  }

  function addError(msg) {
    addLine('✗ ' + msg, 'error');
  }

  // ─── REPL Logic ──────────────────────────────────────────────────────────────

  function runCode(code) {
    if (!code.trim()) return;

    addPrompt(code);

    if (!bridge.connected) {
      addError('Not connected to target app');
      return;
    }

    bridge.eval(code).then(r => {
      if (r?.ok) {
        addResult(r.result);
      } else {
        addError(r?.error ?? 'Unknown error');
      }
    }).catch(e => {
      addError(e.message);
    });
  }

  // ─── Input Handlers ───────────────────────────────────────────────────────────

  inputEntry.connect('activate', () => {
    const code = inputEntry.get_text().trim();
    if (!code) return;

    history.unshift(code);
    historyIdx = -1;
    inputEntry.set_text('');

    runCode(code);
  });

  // Up/Down history via key controller
  const keyCtrl = new Gtk.EventControllerKey();
  keyCtrl.connect('key-pressed', (_, keyval) => {
    if (keyval === 65362) { // Up arrow
      historyIdx = Math.min(historyIdx + 1, history.length - 1);
      if (history[historyIdx] !== undefined) {
        inputEntry.set_text(history[historyIdx]);
        // Move cursor to end
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
          inputEntry.set_position(-1);
          return GLib.SOURCE_REMOVE;
        });
      }
      return true;
    }
    if (keyval === 65364) { // Down arrow
      historyIdx = Math.max(historyIdx - 1, -1);
      inputEntry.set_text(historyIdx >= 0 ? history[historyIdx] : '');
      return true;
    }
    return false;
  });
  inputEntry.add_controller(keyCtrl);

  btnRun.connect('clicked', () => {
    const code = inputEntry.get_text().trim();
    if (!code) return;
    history.unshift(code);
    historyIdx = -1;
    inputEntry.set_text('');
    runCode(code);
  });

  btnClear.connect('clicked', () => {
    for (const lbl of outputLines) output.remove(lbl);
    outputLines.length = 0;
  });

  // ─── Bridge Events ────────────────────────────────────────────────────────────

  bridge.on('connected', () => {
    addLine('── Connected to target ──', 'dim-label');
    addLine('Available: win, findWidget(win, name), signals, print()', 'dim-label');
    addLine('', '');
  });

  bridge.on('disconnected', () => {
    addLine('── Disconnected ──', 'error');
  });

  return root;
}
