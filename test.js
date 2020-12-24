const {
  default: doc, tick, onError, useState, FragmentList,
} = require('somedom/test');

const {
  useRef, useMemo, useEffect, createRender, registerComponent,
} = require('.');

module.exports = async cb => {
  try {
    doc.enable();

    const { $, $$ } = createRender(FragmentList, props => {
      if (props['@html'] && !(process.env.USE_JSDOM || process.env.HAPPY_DOM)) {
        const div = document.createElement('div');

        div.innerHTML = props['@html'];
        return div;
      }
    });

    window.Jamrock = {
      components: Object.create(null),
      Browser: {
        _: {
          $, $$, onError, useRef, useMemo, useState, useEffect, registerComponent,
        },
      },
    };

    await cb(async (key, props) => {
      if (!window.Jamrock.components[key]) {
        throw new ReferenceError(`Component not registered, given '${key}'`);
      }

      const Elem = window.Jamrock.components[key];
      const div = document.createElement('div');
      const el = await Elem.mount(div, props);

      return el;
    });
    await tick();
  } finally {
    doc.disable();
  }
};
