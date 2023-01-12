import { Is, toProps } from '../utils/client.mjs';

export function tag([name, props, children], client, callback) {
  return [name, client && typeof window !== 'undefined' ? toProps(props) : props, callback ? callback(children, client) : children];
}

export function str(value) {
  if (!Is.value(value)) value = Object.prototype.toString.call(value);
  if (!Is.str(value)) value = value.toString();
  return value;
}

export function ents(value) {
  return str(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function nodes(value, client) {
  if (!Is.arr(value)) return value;
  if (Is.vnode(value)) return tag(value, client, nodes);
  return value.map(x => nodes(x, client));
}

export const render = (chunk, data, run, cb = render, $ = undefined) => (chunk.render ? chunk.render(data || {}, {
  $: value => {
    if (value === null || value === false || typeof value === 'undefined') return '';
    if (Is.plain(value) && value !== chunk) value = JSON.stringify(value, null, 2);
    if (!Is.value(value)) value = Object.prototype.toString.call(value);
    return Is.str(value) ? ents(value) : value;
  },
  d: value => {
    return ents(JSON.stringify(value, null, 2));
  },
  e: (name, props, children) => {
    const ref = chunk.self || chunk;

    if (ref.component && (
      ['form', 'select', 'textarea'].includes(name)
      || (name === 'input' && props.type !== 'hidden')
      || (name === 'button' && (props.onclick || props.type === 'submit'))
    )) {
      props['@source'] = `${ref.component.src}/${ref.depth}`;
    }

    if (props['@location'] && (process.env.NODE_ENV === 'production' || (ref.component && !ref.component.destination))) {
      delete props['@location'];
    }

    if (name === 'fragment') {
      props['@request'] = $ && $.uuid;
    }

    return tag([name, props, children], $ && $.client);
  },
  h: value => {
    if (Is.arr(value)) return value;
    return tag(['fragment', { '@html': value }], $ && $.client);
  },
  a: (self, name) => {
    return cb({ render: self.chunks[name].attributes, depth: chunk.depth }, data, run, undefined, $);
  },
  fn: (self, name) => {
    const frag = self.chunks[name];

    if (!frag) return ['pre', {}, `Fragment '${name}' not found`];
    return run(cb({ self, render: frag.template }, data, run, undefined, $), [], undefined, $);
  },
  if: (cond, then, ...branches) => {
    if (cond) return run(then(), [], undefined, $);

    const fallback = branches.pop();

    let otherwise;
    for (const block of branches) {
      const result = block && block();

      if (result) {
        otherwise = result;
        break;
      }
    }

    return run(otherwise || (fallback && fallback()), [], undefined, $);
  },
  map: (subj, body, fallback) => {
    function it(self, offset) {
      return run(body, [self, offset], undefined, $);
    }

    if (Is.plain(subj)) {
      const items = Object.entries(subj);

      return items.length
        ? run(items.map(([k, v]) => it(v, k)), [], undefined, $)
        : run(fallback && fallback(), [], undefined, $);
    }

    let input = [];
    if (Is.iterable(subj) || Is.arr(subj)) input = [...subj];
    else if (Is.num(subj)) input = Array.from({ length: subj }).map((_, i) => i);

    return input.length
      ? run(input.map(it), [], undefined, $)
      : run(fallback && fallback(), [], undefined, $);
  },
  slot: (name, ...children) => {
    const frag = (chunk._slots && chunk._slots[name])
      || (chunk.slots && chunk.slots[name])
      || {};

    if (Is.arr(frag)) return run(frag, [], children, $);
    if (Is.func(frag)) return run(cb({ render: frag }, data, run, undefined, $), [], undefined, $);
    if (Is.func(frag.children)) return run(frag.children(), [], children, $);

    return run(frag.children, [], children, $);
  },
  self: (props, slots, _children) => {
    const _chunk = (chunk.self && chunk.self.component) || chunk;

    _chunk._slots = { ...slots };
    _chunk._slots.default = { children: _children };

    return run(cb(_chunk, props, run, undefined, $), [], undefined, $);
  },
  block: (tpl, name, props, scope, slots, _children) => {
    if (!tpl) {
      const location = props['@location'] ? ` in ${props['@location'].split(':')[0]}` : '';

      return ['pre', {}, `Component '${name}' not found${location}`];
    }

    if (tpl.default) tpl = tpl.default;
    if (tpl.__module) tpl = tpl.__module;

    try {
      tpl._scope = scope;
      tpl._slots = { ...slots };
      tpl._slots.default = _children;
      tpl._parent = name !== 'self' ? chunk : null;

      return run(cb(tpl, props, run, undefined, $), [], undefined, $);
    } catch (e) {
      return ['pre', {}, `${name}: ${e.message} (${(tpl.__module || tpl).src})`];
    }
  },
}) : null);
