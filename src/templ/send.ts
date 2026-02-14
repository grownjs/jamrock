import {
  Is, dump, sleep, dashCase,
} from '../utils/server.ts';

export function decorate($: any, ctx: any, vnode: any, hooks: any[]): void {
  if (hooks.length) {
    hooks.forEach(fn => {
      if (!Is.func(fn[0]) || !fn[0].$) {
        throw new TypeError(`Unknown function '${fn[0].name}'`);
      }

      const state = {};
      const key = `${fn[0].$}/${ctx.depth}`;

      ctx.cache?.set(ctx.uuid, key, state);

      vnode[1]['@enhance'] = true;
      vnode[1][`@use:${dashCase(fn[1])}`] = key;
    });
  }

  if (vnode[1]['@ref']) {
    Object.values($.scripts).some((set: any) => {
      return set.some(([ref, id]: [string, string]) => {
        if (ref === vnode[1]['@ref']) {
          vnode[1]['@use'] = id;
          return true;
        }
        return false;
      });
    });
    delete vnode[1]['@ref'];
  }

  if (vnode[0] === 'form') {
    if (vnode[1].method && vnode[1].method !== 'GET') {
      if (vnode[1].key) {
        vnode[2].unshift(['input', { type: 'hidden', name: '_key', value: vnode[1].key }]);
        delete vnode[1].key;
      }

      vnode[2].unshift(['input', { type: 'hidden', name: '_self', value: vnode[1]['@source'] }]);

      if (ctx.conn) {
        vnode[2].unshift(['input', { type: 'hidden', name: '_csrf', value: ctx.conn.csrf_token }]);
      }
    }
  }
}

export function streamify(): any {
  function peek($: any, key: string, value: any, render: any, fragments: any[]): Promise<any> {
    const { attributes } = fragments.find(_ => _.variables.includes(key)) || {} as any;

    let interval = +(attributes?.interval || 0);
    let timeout = +(attributes?.timeout ?? 50);
    let limit = +(attributes?.limit || 100);
    let mode = attributes?.mode || 'append';

    const ref = $.ref;
    const values: any[] = [];

    let cancelled: boolean;
    let done: boolean;
    let t: any = setTimeout(() => { done = true; }, timeout);

    $.stream.set(`${ref}/${key}`, {
      cancel() {
        clearTimeout(t);
        cancelled = done = true;
      },
      async publish(item: any) {
        await $.publish?.(ref, key, item, mode, render);
      },
    });

    const push = (item: any) => {
      values[mode === 'prepend' ? 'unshift' : 'push'](item);
    };

    const pull = async (next: (values: any[]) => void) => {
      try {
        let i = 0;
        for await (const item of value) {
          if (!done && i++ >= limit) {
            next(values);
            done = true;
          }

          if (!done) push(item);
          else if (process.env.HEADLESS || cancelled) break;
          else {
            if ($.socket?.closed) break;
            if (interval > 0) await sleep(interval);
            if (await $.publish?.(ref, key, item, mode, render)) break;
          }
        }
      } catch (e) {
        dump('E_PULL', e);
      } finally {
        value?.return(true);
        if (process.env.HEADLESS || !done) next(values);
      }
    };

    return new Promise(pull);
  }

  async function sync($: any, state: any, render: any, fragments: any[]): Promise<any> {
    const keys = Object.keys(state);
    const values: Promise<any>[] = [];

    for (const key of keys) {
      if (key[0] === '@') continue;

      const value = state[key];

      if (value && (Is.thenable(value) || Is.generator(value))) {
        values.push(Promise.resolve()
          .then(() => (Is.factory(value) ? value() : value))
          .then((_: any) => (Is.iterable(_) ? peek($, key, _, render, fragments) : _))
          .then((result: any) => { value.current = result; }));
      }
    }

    await Promise.all(values);
    return state;
  }

  const shared = new Map();

  function wrap(ctx: any, uuid: string): any {
    if (!shared.has(uuid)) {
      shared.set(uuid, Object.assign(new Map(), {
        sync: sync.bind(null, ctx),
      }));
    }
    return shared.get(uuid);
  }

  return Object.assign(shared, { wrap });
}
