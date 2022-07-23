const {
  tick, enable, disable,
} = require('somedom/test');

module.exports = async cb => {
  const {
    Runtime: {
      useRef, useMemo, useState, useEffect, onError, createRender, createContext, registerComponent,
    },
  } = await import('./dist/main.mjs');

  try {
    enable();

    const { $, $$ } = createRender();

    window.Jamrock = {
      components: Object.create(null),
      Browser: {
        _: {
          $, $$, onError, useRef, useMemo, useState, useEffect, createContext, registerComponent,
        },
      },
    };

    await cb(async (key, props) => {
      if (!window.Jamrock.components[key]) {
        throw new ReferenceError(`Component not registered, given '${key}'`);
      }

      const Elem = window.Jamrock.components[key];
      const div = document.createElement('div');

      return Elem.mount(div, props);
    });
    await tick();
  } finally {
    disable();
  }
};
