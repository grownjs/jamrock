import { Is, dump, trace, encodeText } from '../utils/server.ts';
import { execute } from '../render/hooks.ts';
import { taggify } from '../markup/html.ts';

function encode(value: string): string {
  return encodeText(value, { quotes: false, unsafe: true })
    .replace(/&quot;/g, '\\"')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface SSESocket {
  identity: string;
  source?: string;
  // eslint-disable-next-line no-unused-vars
  send: (message: string) => void;
  context?: any;
  closed?: boolean;
  env?: any;
  module?: any;
}

export interface DispatchResult {
  welcome?: string;
  response?: { identity: string; method: string; status: number; body: string };
  dispose?: boolean;
}

function parseTriggerPayload(data: string): Record<string, string> {
  if (!data) return {};
  try {
    return Object.fromEntries(new URLSearchParams(data));
  } catch {
    return {};
  }
}

function snapshotState(mod: any): Record<string, any> | null {
  if (!mod) return null;
  try {
    const handler = mod.__handler?.({}, {});
    const ctx = handler?.__context?.();
    const state = ctx?.__callback?.();
    return state || null;
  } catch {
    return null;
  }
}

function serializeState(mod: any): Record<string, string> | null {
  if (!mod) return null;
  try {
    const handler = mod.__handler?.({}, {});
    const ctx = handler?.__context?.();
    const state = ctx?.__callback?.();
    if (!state) return null;
    const snap: Record<string, string> = {};
    for (const key of Object.keys(state)) {
      try {
        const val = state[key];
        if (typeof val === 'function' || (typeof val === 'object' && val?.__src)) {
          continue;
        }
        snap[key] = JSON.stringify(val);
      } catch {
        continue;
      }
    }
    return snap;
  } catch {
    return null;
  }
}

function diffState(pre: Record<string, string>, post: Record<string, string>): string[] {
  const changed: string[] = [];
  for (const key of Object.keys(post)) {
    if (!(key in pre) || pre[key] !== post[key]) {
      changed.push(key);
    }
  }
  return changed;
}

function findAffectedFragments(mod: any, changedVars: string[]): string[] {
  const fragments = mod?.__fragments;
  if (!fragments || !changedVars.length) return [];

  const affected: string[] = [];
  for (const [name, frag] of Object.entries(fragments)) {
    const vars = (frag as any).s || [];
    if (vars.some((v: string) => changedVars.includes(v))) {
      affected.push(name);
    }
  }
  return affected;
}

function rerenderFragment(
  mod: any,
  fragName: string,
  state: Record<string, any>,
): any {
  const fragment = mod?.__fragments?.[fragName];
  if (!fragment) return null;

  const renderFn = fragment.r;
  if (!Is.func(renderFn)) return null;

  try {
    const element = (tag: string, props: Record<string, unknown>, children: unknown): unknown => {
      return taggify([tag, props, children]);
    };

    const view = execute(element, () => null, async (tpl: any, props: unknown) => tpl, (chunk: unknown) => chunk);

    return view(renderFn, state, `${mod.__src}#!${fragName}`);
  } catch (e) {
    trace(e, 'E_RPC_RENDER');
    return null;
  }
}

export function dispatch(
  payload: string,
  ws: SSESocket,
  env: any,
  handler: any,
  // eslint-disable-next-line no-unused-vars
  editor?: (...args: any[]) => void,
): DispatchResult | void {
  if (payload.indexOf('rpc:') !== 0) return;
  // eslint-disable-next-line no-param-reassign
  payload = payload.substr(4);

  const body = payload.includes('\t')
    ? payload.substr(0, payload.indexOf('\t'))
    : payload;

  const [msg, ...args] = body.split(/\s+/);
  const data = payload.substr(body.length + 1);

  if (msg === 'reconnect') {
    ws.identity = args[0];
    return { welcome: `welcome ${args[0]}` };
  }

  if (msg === 'disconnect') {
    return { dispose: true };
  }

  if (msg === 'connect') {
    ws.identity = args[0];
    ws.source = args[1];
    dump('CONNECTED', args);
    return { welcome: `welcome ${args[0]}` };
  }

  if (msg === 'request') {
    const input = data
      ? Object.fromEntries(new URLSearchParams(data))
      : null;

    const req = env.request({
      url: args[2],
      body: input,
      method: args[1],
    });

    req.headers.set('request-uuid', ws.identity);
    req.headers.set('x-requested-with', 'XMLHttpRequest');

    handler.call(req, () => [])
      .then((resp: any) => {
        ws.send(`rpc:response ${ws.identity} ${args[1]} ${resp[1]}\t${resp[0]}`);
      });

    return;
  }

  if (msg === 'trigger') {
    try {
      const uuid = args[0];
      const source = args[1];
      const kind = args[2];
      const callKey = args[3];
      const payload_ = parseTriggerPayload(decodeURIComponent(data));

      if (uuid !== ws.identity) return;

      if (ws.context) {
        ws.context.emit(decodeURIComponent(data), ...args);
        return;
      }

      const [fnName] = (callKey || '').split(':');
      const srcPath = source ? source.replace(/\/\d+$/, '') : null;

      const mod = (srcPath && env?.locateWithNamespace ? env.locateWithNamespace(srcPath) : null)
        || (srcPath && env?.locate ? env.locate(srcPath) : null)
        || ws.module;

      if (!fnName || !mod) return;

      const fn = mod.__rpc_fns?.[fnName]
        || mod.__functions?.[fnName]
        || mod[fnName];

      if (!Is.func(fn)) return;

      const preState = snapshotState(mod);
      const preSerialized = serializeState(mod);
      const result = fn(payload_);
      const postState = snapshotState(mod);
      const postSerialized = serializeState(mod);
      const isAsync = Is.thenable(result);

      const sendUpdates = (changedVars: string[]) => {
        const affectedFrags = findAffectedFragments(mod, changedVars);
        const currentState = snapshotState(mod) || {};

        for (const fragName of affectedFrags) {
          try {
            const vnode = rerenderFragment(mod, fragName, currentState);
            if (vnode && ws.send) {
              const encoded = encode(JSON.stringify(vnode));
              ws.send(`rpc:update ${ws.identity} ${fragName} replace\t${encoded}`);
            }
          } catch (e) {
            trace(e, 'E_RPC_FRAGMENT');
          }
        }
      };

      if (preSerialized && postSerialized) {
        const changedVars = diffState(preSerialized, postSerialized);

        if (isAsync) {
          result.then(() => {
            const postAsyncSerialized = serializeState(mod);
            if (postAsyncSerialized) {
              const asyncChanged = diffState(preSerialized, postAsyncSerialized);
              sendUpdates(asyncChanged.length > 0 ? asyncChanged : changedVars);
            }
          });
        } else if (changedVars.length > 0) {
          sendUpdates(changedVars);
        }
      }
    } catch (e) {
      trace(e, 'E_TRIGGER');
    }
    return;
  }

  if (Is.func(editor) && msg === 'open') {
    editor([args[0]]);
    return;
  }

  return { dispose: true };
}