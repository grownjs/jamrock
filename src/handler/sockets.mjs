import { Is, cleanJSON } from '../utils/server.mjs';

export function setup(ctx, env, editor, handler, timeout) {
  ctx.on('open', ws => {
    if (handler.sync) {
      handler.sync.subscribe(ws);
    }

    ws.stop = () => {
      if (!ws.closed && ws.streams) {
        ws.streams.forEach(ref => {
          if (ws.context.streams.has(ref)) {
            ws.context.streams.get(ref).cancel();
            ws.context.streams.delete(ref);
          }
        });
        ws.streams = null;
        ws.context = null;
      }
    };

    ws.dispose = () => {
      ws.closed = true;
      ws.emit('disconnect');
      ws.stop();

      if (handler.sync) {
        handler.sync.unsubscribe(ws);
      }
    };

    let t;
    ws.on('close', () => {
      clearTimeout(t);
    });
    ws.on('update', (key, _props, children) => {
      ws.send(`rpc:update ${ws.identity} ${key} ${_props.mode || 'append'}\t${cleanJSON(children)}`);
    });
    ws.on('failure', ({ e, msg, args, data }) => {
      console.error('E_SOCKET', { e, msg, args, data });
      if (ctx.socket) {
        ctx.socket.send(`rpc:failure ${ws.identity}\t${JSON.stringify({
          message: e.message,
        })}`);
      }
    });
    ws.on('message', payload => {
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
        ws.streams = new Set();
        ws.identity = args[0];
        ws.send(`welcome ${args[0]}`);
        console.log('CONNECTED');
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
          .then(resp => {
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

  ctx.on('close', ws => {
    ws.dispose();
  });
}
