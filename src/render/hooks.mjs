import { Is } from '../utils/client.mjs';

export function str(value) {
  if (!Is.value(value)) value = Object.prototype.toString.call(value);
  if (!Is.str(value)) value = value.toString();
  return value;
}

export function ents(value) {
  return str(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// FIXME: context should not be needed!!
export const execute = (run, cb) => {
  const context = {
    $: value => {
      if (value === null || value === false || typeof value === 'undefined') return '';
      if (!Is.value(value)) value = Object.prototype.toString.call(value);
      return Is.str(value) ? ents(value) : value.toString();
    },
    d: value => {
      console.debug(value);
      // return ents(JSON.stringify(value, null, 2));
    },
    r: value => {
      if (Is.empty(value)) return;
      return Is.func(value) ? value : () => value;
    },
    h: value => {
      return Is.arr(value) ? value : ['fragment', { '@html': String(value) }];
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

      if (Is.func(tpl.default)) tpl = tpl.default;
      if (_children) props.children = () => _children;

      // FIXME: consider call run, or somewhat instead of a promise...
      return Promise.resolve(tpl.__handler ? tpl.__handler(props, cb) : null)
        .then(ctx => (ctx?.__context ? ctx.__context() : props))
        .then(_ => run(tpl.__template(context, _), []));
    },
  };

  return (view, props) => run(view(context, props), []);
};
