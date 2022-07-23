import './runtime.js';

import path from 'node:path';
import { createEnvironment } from '../shared.mjs';
import { Template, Handler, Runtime } from '../../dist/main.mjs';

export const createServer = async (options = {}) => {
  const { cwd, files, handlers } = await createEnvironment({ Template, Runtime, Handler, options, path });

  return async req => {
    const url = req.url.replace(/^\w+:\/\/[^/]+/, '');
    const ctx = {
      conn: {
        method: req.method,
        path_info: url.split('/').filter(Boolean),
        request_path: url,
        req: {},
        res: {},
        routes: handlers,
      },
    };

    const matches = handlers.find(route => Handler.match(ctx.conn, route.fullpath));

    let status = 200;
    let body;
    try {
      if (matches) {
        ctx.conn.current_module = matches.src.replace(`${cwd}/`, '');
        ctx.template = files[ctx.conn.current_module].source;
        ctx.called = true;

        const mod = files[ctx.conn.current_module].module;
        const name = matches.src.replace('.html', '.cjs');
        const result = await Template.resolve(mod, name, ctx, null, Handler.middleware);

        body = Template.stringify(result);
        status = ctx.conn.res.statusCode || status;
      }
    } catch (e) {
      console.error(e);
      status = 500;
      body = e.stack;
    }

    const headers = {
      'content-type': 'text/html',
    };

    return new Response(body, { status, headers });
  };
};
