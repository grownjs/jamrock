import './runtime.mjs';

import * as path from 'path';
import { createEnvironment } from '../shared.mjs';
import { Template, Handler, Runtime } from '../../dist/main.mjs';

export const createServer = async (options = {}) => {
  const { cwd, files, handlers } = await createEnvironment({ Template, Runtime, Handler, options, path });

  return async conn => {
    const ctx = {
      conn,
      routes: handlers,
    };

    try {
      const matches = handlers.find(route => Handler.match(ctx.conn, route.fullpath));

      if (matches) {
        ctx.conn.current_module = matches.src.replace(`${cwd}/`, '');
        ctx.template = files[ctx.conn.current_module].source;
        ctx.called = true;

        // console.log(matches.src);
        const mod = files[ctx.conn.current_module].module;
        const name = matches.src.replace('.html', '.cjs');
        const result = await Template.resolve(mod, name, ctx, conn.req.params, Handler.middleware);

        conn.res.setHeader('content-type', 'text/html');
        Template.stringify(result, chunk => conn.res.write(chunk));
        conn.res.write(`<script>
          ws = new WebSocket('ws://localhost:8080');
          ws.addEventListener('open', () => {
            ws.send('rpc:connect xxx');
          });
          ws.addEventListener('message', console.log);
          console.log(ws);
        </script>`);
      }
      conn.res.end();
    } catch (e) {
      console.error(e);
      conn.res.status(500);
      conn.res.write(e.stack);
    }
    conn.res.end();
  };
};
