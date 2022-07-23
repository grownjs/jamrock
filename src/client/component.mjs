// FIXME: implement this shit...

import {
  view, bind, thunk, render, styles, classes, listeners, attributes,
} from 'somedom';

// import { Fragment } from './fragment.mjs';
// import { renderSync } from '../render/sync.mjs';

// export function renderComponent(props, tpl) {
//   props = props || {};
//   tpl._slots = props.slots;

//   return renderSync(tpl, props);
// }

export function createRender(Fragment) {
  const $ = bind(render, listeners(), attributes({
    class: classes,
    style: styles,
  }), [{
    fragment: (props, children) => {
      return Fragment.from(props, children, $).target;
    },
  }]);

  const $$ = thunk(null, $);

  return { $, $$ };
}

export function importComponent(key) {
  // return window.Jamrock.components[key];
}

export function registerComponent(id, src, chunk) {
  // window.Jamrock.components[id] = chunk;
  // window.Jamrock.components[src] = id;

  // if (!chunk.template) {
  //   console.log({id,src,chunk});
  //   return chunk;
  // }

  // function Component(props, children) {
  //   props = props || {};
  //   props.slots = props.slots || {};
  //   props.slots.default = props.slots.default || children;

  //   return chunk.render(props);
  // }

  // chunk.template._refs = { self: chunk };

  // const $render = props => ({ ...props, ...chunk.component(props) });

  // const { $$, createContext } = window.Jamrock.Browser._;
  // const $view = view(Component);
  // const Thunk = $$.wrap($view, id);

  // chunk.mount = (el, props, children) => $$.mount(el, [[Thunk, props, children]], true);
  // chunk.render = props => renderComponent(createContext(() => $render(props))().result, chunk.template);

  // return chunk;
}
