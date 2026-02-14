import { Is, dump, trace } from '../utils/server.ts';

export function setup(ctx: any, env: any, editor: any, handler: any, timeout: number): void {
  ctx.on('open', (ws: any) => {
    if (handler?.sync) {
      handler.sync.subscribe(ws);
    }

    ws.dispose = () => {
      try {
        ws.closed = true;
        ws.emit('disconnect');
        ws.stop?.();
        ws.context = null;
      } catch (e) {
        dump('E_DISPOSE', e);
      } finally {
        if (handler?.sync) {
          handler.sync.unsubscribe(ws);
        }
      }
    };

    let t: any;
    ws.on('close', () => {
      clearTimeout(t);
    });
    ws.on('failure', ({ e, msg, args, data }: any) => {
      dump('E_SOCKET', { e, msg, args, data }, !!ctx.socket);
    });
    ws.on('message', (payload: string) => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!ws.closed) ws.send('keep');
      }, timeout);

      if (payload.indexOf('rpc:') !== 0) return;
      payload = payload.substr(4);

      const body = payload.includes('\t')
        ? payload.substr(0, payload.indexOf('\t'))
        : payload;

      const [msg, ...args] = body.split(/\s+/);
      const data = payload.substr(body.length + 1);

      if (msg === 'reconnect') {
        ws.identity = args[0];
        ws.send(`welcome ${args[0]}`);
      } else if (msg === 'disconnect') {
        ws.dispose();
      } else if (msg === 'connect') {
        ws.identity = args[0];
        ws.source = args[1];
        ws.send(`welcome ${args[0]}`);
        dump('CONNECTED', args);
      } else if (msg === 'request') {
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

        handler.call(req, ctx.clients)
          .then((resp: any) => {
            ws.send(`rpc:response ${ws.identity} ${args[1]} ${resp[1]}\t${resp[0]}`);
          });
      } else if (msg === 'trigger') {
        try {
          if (ws.context) {
            if (args[0] === ws.identity) {
              ws.context.emit(decodeURIComponent(data), ...args);
            }
          } else {
            ws.emit('callback', msg, args, data);
          }
        } catch (e) {
          trace(e, 'E_TRIGGER');
          ws.emit('failure', {
            e, msg, args, data,
          });
        }
      } else if (Is.func(editor) && msg === 'open') {
        editor([args[0]]);
      } else {
        ws.dispose();
      }
    });
  });

  ctx.on('close', (ws: any) => {
    if (!ws.closed) ws.dispose();
  });
}
