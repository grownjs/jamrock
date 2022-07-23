import { createContext } from 'somedom';

import { identifier, isArray } from '../utils.mjs';
import { taggify } from '../markup/html.mjs';
import { renderAsync } from './shared.mjs';

const RE_PLACEHOLDERS = /__@@(\w+)__/g;

export async function resolveRecursively(children) {
  const out = await Promise.all(children);

  return Promise.all(out.map(x => (isArray(x)
    ? resolveRecursively(x)
    : x)));
}

export async function renderComponent(self, props, params, callback) {
  const $$props = { ...props, ...(params && params.props) };
  const attributes = {};

  Object.keys($$props).forEach(key => {
    if (key.charAt() === '@'
      || key.indexOf('data-') === 0
      || ['id', 'class', 'style'].includes(key)
    ) attributes[key] = $$props[key];
  });

  if (self.component) {
    const slots = { ...self._slots, ...(params && params.slots) };
    const state = await createContext(async () => {
      const data = { ...$$props, ...self.component($$props) };
      const result = await renderAsync({ slots, render: self.template.render }, data, callback);

      return [[$$props.tag || 'div', attributes, result]];
    })();

    return state.result;
  }

  const pending = [];
  const $$slots = Object.entries(self._slots).reduce((memo, [key, slot]) => {
    memo[key] = () => {
      const ref = identifier();

      pending.push({ ref, slot });
      return `__@@${ref}__`;
    };
    return memo;
  }, {});

  const chunk = self.render($$props, { $$slots });
  const refs = {};

  for (const _chunk of pending) {
    refs[_chunk.ref] = await resolveRecursively(_chunk.slot.children());
  }

  attributes['@html'] = chunk.html.replace(RE_PLACEHOLDERS, (_, $1) => taggify(refs[$1]));

  return [[$$props.tag || 'div', attributes]];
}
