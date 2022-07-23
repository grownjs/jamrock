import { encode } from '../markup/utils.mjs';
import { isArray, isObject, isIterable } from '../utils.mjs';

export const render = (chunk, data, run, cb = render) => (chunk.render ? chunk.render(data || {}, {
  $: value => {
    if (value === null || value === false || typeof value === 'undefined') return '';
    if (isObject(value) && value !== chunk) value = JSON.stringify(value, null, 2);
    return encode(value);
  },
  d: value => {
    console.debug(value);
    return encode(JSON.stringify(value));
  },
  e: (name, props, children) => {
    return [name, props || {}, children || []];
  },
  h: value => {
    return ['fragment', { '@html': value }];
  },
  a: (self, name) => {
    return cb({ render: self.chunks[name].attributes, depth: chunk.depth }, data, run);
  },
  fn: frag => {
    if (!frag) {
      throw new ReferenceError('Fragment not found');
    }

    return run(cb({ render: frag.template }, data, run), []);
  },
  if: (cond, then, ...branches) => {
    if (cond) return run(then(), []);

    const fallback = branches.pop();

    let otherwise;
    for (const block of branches) {
      const result = block && block();

      if (result) {
        otherwise = result;
        break;
      }
    }

    return run(otherwise || (fallback && fallback()), []);
  },
  map: (subj, body, fallback) => {
    function it(self, offset) {
      return run(body, [self, offset]);
    }

    if (isObject(subj)) {
      const items = Object.entries(subj);

      return items.length
        ? run(items.map(([k, v]) => it(v, k)), [])
        : run(fallback && fallback(), []);
    }

    let input = [];
    if (isIterable(subj) || isArray(subj)) input = [...subj];
    else if (typeof subj === 'number') input = Array.from({ length: subj }).map((_, i) => i);

    return input.length
      ? run(input.map(it), [])
      : run(fallback && fallback(), []);
  },
  slot: (name, ...children) => {
    const frag = (chunk._slots && chunk._slots[name])
      || (chunk.slots && chunk.slots[name])
      || {};

    if (isArray(frag)) return run(frag, [], children);
    if (typeof frag === 'function') return run(cb({ render: frag }, data, run), []);
    if (typeof frag.children === 'function') return run(frag.children(), [], children);

    return run(frag.children, [], children);
  },
  self: (props, slots, _render) => {
    chunk._slots = { ...slots };
    chunk._slots.default = { children: _render };

    return run(cb(chunk, props, run), []);
  },
  block: (tpl, src, props, slots, _render) => {
    if (!tpl) {
      throw new ReferenceError('Component not found');
    }

    if (tpl.default) {
      tpl = tpl.default;
    }

    if (src) {
      props['@component'] = src;
    }

    tpl._slots = { ...slots };
    tpl._slots.default = { children: _render };

    return run(cb(tpl, props, run), []);
  },
}) : null);
