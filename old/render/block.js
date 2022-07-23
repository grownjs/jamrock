import { encode, isObject } from '../shared/utils.js';

export const render = (chunk, data, run, cb = render) => chunk.render({ ...data }, {
  $: value => {
    if (value === null || value === false || typeof value === 'undefined') return '';
    if (isObject(value)) return JSON.stringify(value, null, 2);
    return typeof value === 'string' ? encode(value) : value;
  },
  d: value => {
    console.debug(value);
    return encode(JSON.stringify(value));
  },
  c: (ctx, $props, $slots, ...children) => {
    const $blocks = ctx.components;
    const $from = ctx.source;
    const $src = $props.src;

    delete $props.src;
    return ['fragment', {
      $props, $src, $from, $slots, $blocks,
    }, children];
  },
  h: value => {
    return ['fragment', { '@html': value, raw: true }];
  },
  fn: (self, name) => {
    if (!self.fragments[name]) {
      throw new ReferenceError(`Fragment not found, given '${name}'`);
    }

    return run(cb({ render: self.fragments[name].template }, data, run), null);
  },
  if: (cond, then, ...branches) => {
    if (cond) return run(then(), null);

    const fallback = branches.pop();

    let otherwise;
    for (const block of branches) {
      const result = block && block();

      if (result) {
        otherwise = result;
        break;
      }
    }

    return run(otherwise || (fallback && fallback()), null);
  },
  map: (list, body, fallback) => {
    const [subj, expr] = list;

    let locals = [];
    let alias = '';
    let index = '';

    if (expr) {
      const matches = expr.match(/\[(.+?)\]/);
      if (matches) {
        locals = matches[1].split(',').map(x => x.trim());
        index = (expr.match(/\]\s*,\s*(\w+)/) || [])[1];
      } else {
        const parts = expr.split(',').map(x => x.trim());

        alias = parts.shift();
        index = parts.shift();
      }
    }

    function invoke(self, offset) {
      const ctx = { ...(typeof self === 'object' ? self : null) };

      if (alias) ctx[alias] = self;
      if (index) ctx[index] = offset;

      if (locals.length) {
        if (!Array.isArray(self)) {
          throw new TypeError(`Value is not iterable, given '${expr}'`);
        }

        locals.forEach((key, i) => {
          ctx[key] = self[i];
        });
      }

      return () => run(body, self, ctx);
    }

    if (isObject(subj)) {
      const items = Object.entries(subj);

      return items.length
        ? run(items.map(([k, v]) => invoke(v, k)))
        : run(fallback && fallback(), null);
    }

    let input = [];
    if (Array.isArray(subj)) input = subj.slice();
    if (typeof subj === 'number') input = Array.from({ length: subj }).map((_, i) => i);

    return input.length
      ? run(input.map(invoke))
      : run(fallback && fallback(), null);
  },
  slot: (name, ...children) => {
    const slots = { ...chunk.slots, ...chunk._slots };
    const frag = slots[name] || {};

    if (Array.isArray(frag)) return run(frag, null, null, children);

    if (typeof frag === 'function') return run(cb({ render: frag }, data, run), null);

    if (typeof frag.children === 'function') return run(frag.children(), null, null, children);

    return run(frag.children, null, null, children);
  },
  block: (name, props, slots, _render) => {
    const target = name === 'self' ? chunk : data[name];

    if (!target) {
      throw new ReferenceError(`Undefined '${name}' component`);
    }

    target._key = name;
    target._slots = { ...slots };
    target._parent = name !== 'self' ? chunk : null;
    target._slots.default = { children: _render };

    return run(cb(target, props || {}, run), null);
  },
});
