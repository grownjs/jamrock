export function ready(conn, sockets, callback) {
  let ms = 50;
  let c = 10;
  setTimeout(async function tick() {
    const ws = sockets.find(x => conn.req.uuid === x.identity && !x.closed);

    if (ws) {
      callback(ws, conn);
      return;
    }
    if (c <= 0) return;
    ms *= 1.33;
    c -= 1;
    setTimeout(tick, ms);
  }, ms);
}

export function setup(ctx, editor, timeout) {
  ctx.on('open', ws => {
    let t;
    ws.on('close', () => {
      clearTimeout(t);
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

      if (msg === 'disconnect') {
        Object.keys(ws.instances).forEach(k => {
          ws.instances[k].cancel();
        });
        ws.emit('disconnect');
      } else if (msg === 'connect') {
        ws.instances = Object.create(null);
        ws.identity = args[0];
        ws.send(`welcome ${args[0]}`);
      } else if (msg === 'request') {
        ws.emit('request', args, data);
      } else if (msg === 'trigger') {
        try {
          if (ws.handler) {
            ws.handler.call(ws, args, data);
          } else {
            ws.emit('callback', msg, args, data);
          }
        } catch (e) {
          ws.emit('failure', {
            e, msg, args, data,
          });
        }
      } else if (editor && msg === 'open') {
        editor.open(args[0]).catch(err => {
          console.debug('E_OPEN', err);
        });
      } else {
        ws.close();
      }
    });
  });

  ctx.on('close', ws => {
    if (!ws.closed && ws.instances) {
      Object.keys(ws.instances).forEach(k => {
        ws.instances[k].cancel();
      });
      delete ws.instances;
    }
    ws.closed = true;
    ws.emit('disconnect');
  });
}
