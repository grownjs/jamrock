/* eslint-disable no-use-before-define */

import type { SizingRule, SizingValues, SizingValueDeps } from './main.ts';

const DEFAULT_RULES: SizingValues = {
  mt: (v, { BASE_UNIT }) => ({ marginTop: +v * BASE_UNIT }),
  mb: (v, { BASE_UNIT }) => ({ marginBottom: +v * BASE_UNIT }),
  ms: (v, { BASE_UNIT }) => ({ marginStart: +v * BASE_UNIT }),
  me: (v, { BASE_UNIT }) => ({ marginEnd: +v * BASE_UNIT }),
  m: v => [{ mt: v }, { mb: v }, { ms: v }, { me: v }],
  mx: v => [{ ms: v }, { me: v }],
  my: v => [{ mt: v }, { mb: v }],
  sp: (v, { BASE_UNIT }) => ({ spacing: +v * BASE_UNIT }),
  hx: () => ({ hexpand: true }),
  vx: () => ({ vexpand: true }),
  h: v => ({ height_request: +v }),
  w: v => ({ width_request: +v }),
  o: v => ({ opacity: +v / 10 }),
  va: (v, { Gtk }) => ({
    // @ts-expect-error
    valign: bail(Gtk.Align[v.toUpperCase()], 'va', v, 'valign'),
  }),
  ha: (v, { Gtk }) => ({
    // @ts-expect-error
    halign: bail(Gtk.Align[v.toUpperCase()], 'ha', v, 'halign'),
  }),
  bo: (v, { Gtk }) => ({
    // @ts-expect-error
    orientation: bail(Gtk.Orientation[v.toUpperCase()], 'bo', v, 'orientation'),
  }),
};

export function sizing(value: string, ctx: SizingValueDeps) {
  const parts = value.split(' ');

  const target = {
    callbacks: [] as Function[],
    classNames: [] as string[],
  };

  return parts.reduce((memo, chunk) => {
    const [key, nth] = chunk.split('-');
    const val = DEFAULT_RULES[key as SizingRule];

    const res: Record<string, any>[] = [].concat(val ? val(nth, { ...DEFAULT_RULES, ...ctx }) : []);
    const classes = [];

    res.forEach(obj => {
      Object.entries(DEFAULT_RULES).forEach(([k, v]) => {
        if (obj[k]) {
          Object.assign(obj, v(obj[k], ctx));
          delete obj[k];
        }
      });
    });

    res.forEach(merge => {
      if (typeof merge === 'function') {
        memo.callbacks.push(merge);
      } else {
        Object.assign(memo, merge);
        classes.push(merge);
      }
    });

    if (!classes.length) {
      memo.classNames.push(chunk);
    }
    return memo;
  }, target);
}

export function bail(value: number, key: string, val: string, id: string) {
  if (typeof value === 'undefined') throw new Error(`Unknown rule ${key}-${val} (${id})`);
  return value;
}

export function cls(value: string, deps: SizingValueDeps) {
  const { callbacks, classNames, ...overrides } = sizing(value, deps);
  return { overrides, classes: classNames, hooks: callbacks };
}
