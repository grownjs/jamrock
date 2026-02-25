import { Gtk } from './deps.js';

try { Gtk.init(); } catch(e) {}

const widgetMap = {
  div: 'Box',
  span: 'Label',
  button: 'Button',
  input: 'Entry',
  label: 'Label',
  img: 'Picture',
  picture: 'Picture',
  a: 'LinkButton',
  select: 'DropDown',
  checkbox: 'CheckButton',
  check: 'CheckButton',
  radio: 'RadioButton',
  ul: 'ListBox',
  ol: 'ListBox',
  li: 'ListBoxRow',
  table: 'Grid',
  tr: 'Grid',
  td: 'Grid',
  th: 'Grid',
  form: 'Box',
  section: 'Box',
  article: 'Box',
  header: 'Box',
  footer: 'Box',
  nav: 'Box',
  main: 'Box',
  aside: 'Box',
  p: 'Label',
  h1: 'Label',
  h2: 'Label',
  h3: 'Label',
  h4: 'Label',
  h5: 'Label',
  h6: 'Label',
  textarea: 'TextView',
  canvas: 'DrawingArea',
  svg: 'DrawingArea',
  iframe: 'WebViewWidget',
};

function createWidget(tag, props = {}, children = null) {
  const widgetType = widgetMap[tag.toLowerCase()] || 'Label';
  const WidgetClass = Gtk[widgetType] || Gtk.Label;

  let widget;
  try {
    widget = new WidgetClass();
  } catch (e) {
    widget = new Gtk.Label({ label: `[${tag}]` });
  }

  if (props.class) {
    const classes = props.class.split(' ').filter(c => c);
    classes.forEach(c => widget.add_css_class(c));
  }

  if (props.id) {
    widget.set_name(props.id);
  }

  if (props.style) {
    widget.set_inline_style(props.style);
  }

  if (props.value !== undefined) {
    if (widget.set_text) {
      widget.set_text(String(props.value));
    } else if (widget.set_active !== undefined) {
      widget.set_active(!!props.value);
    }
  }

  if (props.placeholder !== undefined && widget.set_placeholder_text) {
    widget.set_placeholder_text(props.placeholder);
  }

  if (props.href !== undefined && widget.set_uri) {
    widget.set_uri(props.href);
  } else if (props.href !== undefined && widget.set_link) {
    widget.set_link(props.href);
  }

  if (props.onclick && widget.connect) {
    widget.connect('clicked', props.onclick);
  }

  if (props.onchange && widget.connect) {
    widget.connect('changed', props.onchange);
  }

  if (props.oninput && widget.connect) {
    widget.connect('notify::text', props.oninput);
  }

  if (props.label !== undefined && widget.set_label) {
    widget.set_label(String(props.label));
  }

  if (props.src !== undefined && widget.set_filename) {
    widget.set_filename(props.src);
  }

  return { widget, widgetType };
}

function buildWidgetTree(node, parent = null) {
  if (!node) return null;

  if (typeof node === 'string' || typeof node === 'number') {
    if (parent && parent.set_text) {
      parent.set_text(String(node));
    }
    return new Gtk.Label({ label: String(node) });
  }

  if (!Array.isArray(node)) {
    return null;
  }

  const [tag, props = {}, children = null] = node;
  const { widget, widgetType } = createWidget(tag, props);

  let childContainer = widget;

  if (widgetType === 'Box') {
    const orientation = props.orientation || 'vertical';
    widget.set_orientation(orientation === 'horizontal' ? Gtk.Orientation.HORIZONTAL : Gtk.Orientation.VERTICAL);
    widget.set_spacing(4);

    if (children) {
      const childArray = Array.isArray(children) ? children : [children];
      for (const child of childArray) {
        if (!child) continue;
        const childWidget = buildWidgetTree(child, widget);
        if (childWidget) {
          widget.append(childWidget);
        }
      }
    }
  } else if (widgetType === 'Grid') {
    let row = 0;
    let col = 0;

    const processChildren = (kids) => {
      if (!kids) return;

      const childArray = Array.isArray(kids) ? kids : [kids];

      for (const child of childArray) {
        if (!child) continue;

        const childWidget = buildWidgetTree(child, widget);
        if (childWidget) {
          if (tag === 'tr') {
            widget.attach(childWidget, col++, 0, 1, 1);
          } else if (tag === 'td' || tag === 'th') {
            widget.attach(childWidget, col++, 0, 1, 1);
          } else {
            widget.append(childWidget);
          }
        }
      }
    };

    processChildren(children);
  } else if (widgetType === 'ListBox') {
    const processChildren = (kids) => {
      if (!kids) return;

      const childArray = Array.isArray(kids) ? kids : [kids];

      for (const child of childArray) {
        if (!child) continue;

        const childWidget = buildWidgetTree(child, widget);
        if (childWidget) {
          widget.append(childWidget);
        }
      }
    };

    processChildren(children);
  } else if (widgetType === 'Button') {
    if (children) {
      if (typeof children === 'string') {
        widget.set_label(children);
      } else if (Array.isArray(children)) {
        const label = new Gtk.Label({ label: String(children[2] || '') });
        widget.set_child(label);
      }
    }
  } else if (widgetType === 'LinkButton') {
    if (props.href) {
      widget.set_uri(props.href);
    }
    if (children) {
      const label = new Gtk.Label({ label: String(children) });
      widget.set_child(label);
    }
  } else if (widget.set_child) {
    if (children) {
      if (typeof children === 'string') {
        widget.set_child(new Gtk.Label({ label: children }));
      } else if (Array.isArray(children)) {
        const childWidget = buildWidgetTree(children, widget);
        if (childWidget) {
          widget.set_child(childWidget);
        }
      }
    }
  }

  return widget;
}

export function renderGtk(template, props = {}) {
  return buildWidgetTree(template, null);
}

export function createElement(tag, props = {}, children = null) {
  return [tag, props, children];
}

export function createGtkApp(template, props = {}) {
  const widget = buildWidgetTree(template, null);

  const window = new Gtk.Window({
    title: props.title || 'Jamrock GTK App',
    default_width: props.width || 800,
    default_height: props.height || 600,
  });

  if (props.onclose) {
    window.connect('close-request', props.onclose);
  }

  window.set_child(widget);

  return { window, widget };
}

export { widgetMap, createWidget, buildWidgetTree };
