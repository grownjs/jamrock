import { Is, toProps } from '../utils/client.mjs';

export function str(value) {
  if (!Is.value(value)) value = Object.prototype.toString.call(value);
  if (!Is.str(value)) value = value.toString();
  return value;
}

export function ents(value) {
  return str(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const execute = (loader, next, run) => {
  const context = {
    $: value => {
      if (value === null || value === false || typeof value === 'undefined') return '';
      if (!Is.value(value)) value = Object.prototype.toString.call(value);
      return Is.str(value) ? ents(value) : value.toString();
    },
    d: value => {
      if (typeof window === 'undefined') console.debug('E_DEBUG', value);
      return ents(JSON.stringify(value, null, 2));
    },
    r: value => {
      if (Is.empty(value)) return;
      return Is.func(value) ? value : () => value;
    },
    h: value => {
      return Is.arr(value) ? value : ['fragment', { '@html': String(value) }];
    },
    e: (name, props, children) => {
      return [name, typeof window !== 'undefined' && window.__client ? toProps(props) : props, children];
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
      function it(_, offset) {
        return run(body, [_, offset]);
      }

      if (Is.plain(subj)) {
        const items = Object.entries(subj);

        return items.length
          ? run(items.map(([k, v]) => it(v, k)), [])
          : run(fallback && fallback(), []);
      }

      let input = [];
      if (Is.iterable(subj) || Is.arr(subj)) input = [...subj];
      else if (Is.num(subj)) input = Array.from({ length: subj }).map((_, i) => i);

      return input.length
        ? run(input.map(it), [])
        : run(fallback && fallback(), []);
    },
    block: (tpl, name, props, _children) => {
      if (!tpl) throw new Error(`Missing '${name}' component`);
      if (_children) props.children = () => _children;

      return run(next(tpl, props, loader, context), []);
    },
  };

  return (view, props) => run(view(context, props), []);
};
