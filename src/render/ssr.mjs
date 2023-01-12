import { renderAsync, resolveRecursively } from './async.mjs';
import { Is, pick, cleanJSON } from '../utils/server.mjs';
import { taggify } from '../markup/html.mjs';

import * as runtime from './runtime.mjs';

const RE_SLOT_MARKUP = /<slot(?:\sname="(\w+)")?\s\/>/g;
const RE_ALLOWED_PROPS = /^(?:on(?:interaction|savedata|visible|media|idle)|(?:aria|data)-[\w-]+|@[\w:-]+|tabindex|style|class|name|role|for|id)$/;

export async function serverComponent(ctx, self, props, params, callback, resolver, stylesheets) {
  if (ctx.depth) ++ctx.depth;

  const depth = ctx.depth || 0;
  const $$data = { attrs: {}, state: {} };
  const $$self = { ...props, ...(params && params.props), '@component': `${self.src}:${depth}` };

  const slots = { ...self._slots, ...(params && params.slots) };
  const $$props = (self._scope && self._scope[0]) || [];
  const $$scoped = (self._scope && self._scope[1]) || [];
  const locals = $$props.concat($$scoped);

  Object.keys($$self).forEach(key => {
    if (ctx === $$self[key]
      || $$self[key] === ctx.conn
      || (ctx.conn && ctx.conn.unsafe($$self[key]))
      || (!(locals.includes(key) || RE_ALLOWED_PROPS.test(key)))) return;
    $$data[RE_ALLOWED_PROPS.test(key) ? 'attrs' : 'state'][key] = $$self[key];
  });

  const data = JSON.stringify($$data.state, (_, v) => {
    if (v === ctx || (ctx.conn && (v === ctx.conn || ctx.conn.unsafe(v)))) return undefined;
    return v;
  });

  const scope = JSON.stringify([$$props.filter(x => !RE_ALLOWED_PROPS.test(x)), $$scoped]);

  if (self.resolve) {
    const ref = depth > 0 ? self : null;

    const $$mod = { filepath: self.src, module: self };
    const next = await self.resolve.call($$mod, $$data.state, self.src, null, null, null, mod => {
      if (mod === 'jamrock') return runtime;
      return resolver(mod, self.src, self.destination);
    });

    const state = await next.state.result;
    const _props = { ...$$data.state, ...state, $$props: $$data.state, $$slots: {} };

    Object.keys(slots).forEach(key => {
      _props.$$slots[key] = !!slots[key];
    });

    const result = await renderAsync({ slots, depth, render: self.render, component: ref }, _props, callback, ctx);

    if (ctx.conn && ctx.conn.store) {
      const vars = $$scoped.filter(x => !RE_ALLOWED_PROPS.test(x)).map(x => x).join(', ');

      let code = '';
      // eslint-disable-next-line guard-for-in
      for (const slot in slots) {
        if (slots[slot]) {
          code += `"${slot}": ${slots[slot].toString()
            .replace(/async |await /g, '')
            .replace('() =>', () => `({ ${vars} }, $$) =>`)},\n`;
        }
      }

      ctx.conn.store.del($$self['@component'].split(':')[0]);
      ctx.conn.store.set($$self['@component'], `${data}\0${scope}\0${code}`);
    }

    return [$$self.tag || 'div', $$data.attrs, result || []];
  }

  const pending = [];
  const $$slots = Object.entries(slots).reduce((memo, [key, slot]) => {
    if (Is.func(slot)) {
      memo[key] = () => {
        pending.push({ ref: key, render: slot });
        return `<slot${key === 'default' ? '' : ` name="${key}"`} />`;
      };
    }
    return memo;
  }, {});

  const chunk = self.render(pick($$data.state, $$props), { $$slots });
  const refs = {};

  for (const _chunk of pending) {
    const children = await _chunk.render();

    refs[_chunk.ref] = await resolveRecursively(children);

    if (Is.vnode(refs[_chunk.ref])) refs[_chunk.ref] = [refs[_chunk.ref]];
  }

  if (chunk.css) {
    stylesheets[self.src] = chunk.css.code;
  }

  if (ctx.conn && ctx.conn.store) {
    let code = '';
    // eslint-disable-next-line guard-for-in
    for (const ref in refs) {
      code += `"${ref}": () => ${cleanJSON(refs[ref])},\n`;
    }

    ctx.conn.store.del($$self['@component'].split(':')[0]);
    ctx.conn.store.set($$self['@component'], `${data}\0${scope}\0${code}`);
  }

  $$data.attrs['@html'] = chunk.html.replace(RE_SLOT_MARKUP, (_, $1) => taggify(refs[$1 || 'default']));

  return [$$self.tag || 'div', $$data.attrs, []];
}
