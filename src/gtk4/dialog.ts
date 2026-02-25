import { createWidget } from './ctx.ts';

import type { CallbackDeps, DialogProps } from './main.ts';

function dialogFactory({ vstack, button, label, box, Gtk }: CallbackDeps, props: DialogProps) {
  const el = new Gtk.Window({
    title: props?.title || 'Untitled',
    decorated: false,
    modal: true,
    resizable: false,
    default_width: 420,
    default_height: 140,
  });

  if (props.win) {
    el.set_transient_for(props.win);
  }

  const ok = button('OK', { onClick: () => el.destroy() });

  el.set_child(vstack([
    props.message ? label(props.message) : null,
    box([ok], { className: 'ha-center' }),
  ], { className: 'm-2 sp-2' }));

  el.set_default_widget(ok);
  return el;
}

export const createDialog = createWidget(dialogFactory);
