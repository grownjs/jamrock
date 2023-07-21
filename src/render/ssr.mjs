import { resolveRecursively } from './async.mjs';
import { Is, pick, cleanJSON } from '../utils/server.mjs';
// import { taggify } from '../markup/html.mjs';

import * as runtime from './runtime.mjs';

const renderAsync = () => null;

// const RE_SLOT_MARKUP = /<slot(?:\sname="(\w+)")?\s\/>/g;
const RE_ALLOWED_PROPS = /^(?:on(?:interaction|savedata|visible|media|idle)|(?:aria|data)-[\w-]+|@[\w:-]+|tabindex|style|class|name|role|for|id)$/;

// this is a good example of what I am thinking... we store the components state into the shared store,
// per-rendered-component, if somehow we can leverage on a pubsub store, we could create subscriptions
// from components that used certain state... and, when asked, we refresh this state and perform
// updates if some state changed... this same state should be injected after everything like
// svelte does, i.e. <script>window.shared.__sync(...)</script> and thus, resolving the
// pending promises related to them... or simply by doing a separate request we could
// perform the same trick... after all, we're not sure if streaming is reliable,
// but requests are idempotent!!
// so, we can delay these renders?
// placeholders are rendered as html,
// the some code awakes them by doing a request?
// this request would mount and patch, or just patch
// if needed, etc.
// remember we have access through ws to the current request,
// so we can also save a snapshot than can be read within ws calls?

export async function serverComponent(ctx, self, props, params, callback, resolver, prelude, styles) {
  // if (ctx.depth) ++ctx.depth;

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

    // Object.keys(slots).forEach(key => {
    //  _props.$$slots[key] = !!slots[key];
    // });

    const result = await renderAsync({ slots, depth, render: self.render, component: ref }, _props, callback, ctx);

    // if (ctx.conn && ctx.conn.store) {
    // const vars = $$scoped.filter(x => !RE_ALLOWED_PROPS.test(x)).map(x => x).join(', ');

    let code = '';
    // eslint-disable-next-line guard-for-in
    //    for (const slot in slots) {
    //      if (slots[slot]) {
    //        code += `"${slot}": ${slots[slot].toString()
    //          .replace(/async |await /g, '')
    //          .replace('() =>', () => `({ ${vars} }, $$) =>`)},\n`;
    //      }
    //    }

    // this is for hydration, since components were rendered already
    // later we'll use this to instantiate the association component
    // same identity will be used as well for later updates...
    // console.log('PRELUDE', $$self['@component']);
    if (prelude) prelude.push(`window.Jamrock.Components.define('${$$self['@component']}', ${data}, ${scope}, {${code}})`);
    // }

    return [$$self.tag || 'div', $$data.attrs, result || []];
  }

  const pending = [];
  //  const $$slots = Object.entries(slots).reduce((memo, [key, slot]) => {
  //    if (Is.func(slot)) {
  //      memo[key] = () => {
  //        pending.push({ ref: key, render: slot });
  //        return `<slot${key === 'default' ? '' : ` name="${key}"`} />`;
  //      };
  //    }
  //    return memo;
  //  }, {});

  const chunk = self.render(pick($$data.state, $$props));
  const refs = {};

  for (const _chunk of pending) {
    const children = await _chunk.render();

    refs[_chunk.ref] = await resolveRecursively(children);

    if (Is.vnode(refs[_chunk.ref])) refs[_chunk.ref] = [refs[_chunk.ref]];
  }

  if (chunk.css) {
    styles[self.src] = chunk.css.code;
  }

  // if (ctx.conn) {
  let code = '';
  // eslint-disable-next-line guard-for-in
  for (const ref in refs) {
    code += `"${ref}": () => ${cleanJSON(refs[ref])},\n`;
  }

  // ctx.conn.store.del($$self['@component'].split(':')[0]);
  // ctx.conn.store.set($$self['@component'], `${data}\0${scope}\0${code}`);
  prelude.push(`window.Jamrock.Components.define('${$$self['@component']}', ${data}, ${scope}, {${code}})`);
  // }

  // $$data.attrs['@html'] = chunk.html.replace(RE_SLOT_MARKUP, (_, $1) => taggify(refs[$1 || 'default']));

  return [$$self.tag || 'div', $$data.attrs, []];
}
