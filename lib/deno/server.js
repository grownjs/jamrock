import './runtime.js';

import * as path from 'https://deno.land/std/path/mod.ts';
import { createEnvironment } from '../shared.mjs';
import { Template, Handler, Runtime } from '../../dist/main.mjs';

export const createServer = async (options = {}) => {
  const { cwd, files, handlers } = await createEnvironment({ Template, Runtime, Handler, options, path });

  return async req => {
    const host = req.headers.get('host');
    const url = req.url.split(host).pop();

    const ctx = {
      conn: {
        req: req,
        res: { statusCode: 501 },
        method: req.method,
        path_info: url.split('/').filter(Boolean),
        request_path: url,
        routes: handlers,
      },
    };

    const matches = handlers.find(route => Handler.match(ctx.conn, route.fullpath));

    let status = 200;
    let body;
    if (matches) {
      try {
        ctx.conn.current_module = matches.src.replace(`${cwd}/`, '');
        ctx.template = files[ctx.conn.current_module].source;
        ctx.called = true;

        const mod = files[ctx.conn.current_module].module;
        const name = matches.src.replace('.html', '.cjs');
        const result = await Template.resolve(mod, name, ctx, null, Handler.middleware);

        body = Template.stringify(result);
      } catch (e) {
        console.error(e);
        status = 500;
        body = e.stack;
      }
    }

    const headers = {
      'content-type': 'text/html',
    };

    return new Response(body, { status, headers });
  };
};
