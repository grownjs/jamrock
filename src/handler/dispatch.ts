import { Is, dump, trace } from '../utils/server.ts';

export interface SSESocket {
  identity: string;
  source?: string;
  // eslint-disable-next-line no-unused-vars
  send: (message: string) => void;
  context?: any;
  closed?: boolean;
}

export interface DispatchResult {
  welcome?: string;
  response?: { identity: string; method: string; status: number; body: string };
  dispose?: boolean;
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
      if (ws.context) {
        if (args[0] === ws.identity) {
          ws.context.emit(decodeURIComponent(data), ...args);
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
