import {
  view, bind, thunk, render, styles, classes, listeners, attributes, createContext,
} from 'somedom';

import Fragment from './fragment';
import { renderSync } from './sync';

export function invoke(chunk, payload) {
  const _render = (_chunk, locals) => {
    if (chunk._refs[_chunk._key]) {
      return renderSync(chunk._refs[_chunk._key], {
        ...payload,
        slots: chunk._refs[_chunk._key]._slots,
      }, _render);
    }
    return renderSync(_chunk, locals, _render);
  };
  return chunk ? _render(chunk, payload) : _render;
}

export function createRender(ctx, cb) {
  const $ = bind(render, listeners(), attributes({
    class: classes,
    style: styles,
  }), [{
    fragment: (props, children) => {
      if (children.length === 1 && Array.isArray(children[0])) children = children[0];
      return (typeof cb === 'function' && cb(props, children)) || Fragment.from(props, children, $).target;
    },
  }]);

  const $$ = thunk(null, $);

  return { $, $$ };
}

export function renderComponent(props, tpl) {
  props = props || {};
  tpl._slots = props.slots;

  Object.keys(props).forEach(key => {
    if (props[key] && typeof props[key].component === 'function') {
      tpl._refs[key] = props[key] || tpl._refs[key];
    }
  });

  return invoke(tpl, props);
}

export function registerComponent(key, chunk) {
  function Component(props, children) {
    props = props || {};
    props.slots = props.slots || {};
    props.slots.default = props.slots.default || children;

    return chunk.render(props);
  }

  chunk.template._refs = { self: chunk };

  const $render = props => ({ ...props, ...chunk.component(props) });

  if (typeof window === 'undefined') {
    chunk.render = props => renderComponent(createContext(() => $render(props))().result, chunk.template);
  } else {
    const { $$ } = window.Jamrock.Browser._;
    const $view = view(Component);
    const Thunk = $$.wrap($view, key);

    window.Jamrock.components[key] = chunk;

    chunk.render = props => renderComponent($render(props), chunk.template);
    chunk.mount = (el, props, children) => $$.mount(el, [[Thunk, props, children]], true);
  }

  return chunk;
}
