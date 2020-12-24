const fs = require('fs-extra');
const path = require('path');
const td = require('testdouble');
const { expect } = require('chai');

const cli = require('../bin/cli.js');
const main = require('../src/main');

delete require.cache[require.resolve('../src/main')];

main.Template.valid = obj => (
  obj !== null && typeof obj === 'object' && obj._tpl && obj._tpl.name === 'c$$'
);

const cwd = process.cwd();

/* global beforeEach, afterEach, describe, it */
/* eslint-disable no-unused-expressions */

describe('integration', () => {
  beforeEach(() => {
    process.headless = true;
    process.chdir('seed');
  });
  afterEach(done => setTimeout(() => {
    process.headless = false;
    process.chdir(cwd);
    done();
  }, 100));

  describe('command line', () => {
    let $;

    beforeEach(async () => {
      td.replace(fs, 'ensureDirSync', td.func('mkdir'));
      td.replace(main.Mortero, 'run', td.func('run'));
      td.when(main.Mortero.run(td.matchers.isA(Array)))
        .thenResolve();

      process.env.PORT = 8999;
      process.silent = true;

      $ = cli([
        's', 'up',
        '--silent',
        '--no-redis',
        '--cwd', 'app/pages',
        '--dest', 'build',
        '--upload', '/tmp',
        '--scaffold', '--build',
      ]);

      $.Grown.CLI._task = 'server';

      td.replace($.Grown.CLI, '_exec', td.func('_exec'));
      $.Grown.use(require('@grown/test'));
      $.app.plug($.Grown.Test);
      $.main();

      expect(td.explain($.Grown.CLI._exec).callCount).to.eql(0);
    });

    afterEach(() => {
      $.app.close();
      td.reset();
    });

    it('should pass a smoke-test', async () => {
      await $.app.request('/foo/bar', (err, conn) => {
        conn.res.ok(err, 'Page not found.', 404);
      });
    });

    it('should responds to /api', async () => {
      await $.app.request('/api', (err, conn) => {
        conn.res.ok(err, /Hello World from \/api/);
      });
    });

    it('should responds to /login', async () => {
      await $.app.request('/login', (err, conn) => {
        conn.res.ok(err, /Please log in/);
      });
    });

    it('should responds to /new', async () => {
      await $.app.request('/new', (err, conn) => {
        conn.res.ok(err, /Your info\./);
      });
    });

    it('should responds to /forms', async () => {
      const opts = {
        url: '/forms',
        headers: {
          'content-type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
        },
      };

      let a;
      await $.app.request(opts, (err, conn) => {
        a = conn.resp_body.markup.body;
      });

      opts.method = 'POST';
      opts.body = {
        'form-identifier': 'test',
        input: '42',
        f: 'bar',
        a: '4',
        b: '4',
      };

      let b;
      await $.app.request(opts, (err, conn) => {
        b = conn.resp_body.markup.body;
      });

      expect(a).not.to.eql(b);
    }).timeout(5000);
  });

  describe('main module', () => {
    let handler;
    let ctx;

    beforeEach(async () => {
      handler = null;
      ctx = {
        req: {
          url: '/',
        },
        env: {
          NODE_ENV: 'development',
        },
        on: () => {},
        mount: cb => {
          handler = cb;
        },
        cache: {
          get: () => null,
          set: () => null,
        },
        clients: () => [],
        get_flash: () => [],
        put_session: () => {},
        params: {},
        session: {},
        cookies: {},
        body_params: {},
        req_headers: {},
        query_params: {},
        method: 'GET',
        path_info: [],
        request_path: '/',
        send_file: td.func('send_file'),
      };
      const opts = {
        jamrock: path.resolve(__dirname, '../dist/shared'),
      };
      const scope = (id, def) => {
        def.$install(ctx, { _options: () => opts });
      };
      main(scope, require('@grown/bud/util'));
    });

    it('should pass a smoke-test', async () => {
      await handler(ctx);
      expect(ctx.status_code).to.eql(404);
      expect(ctx.resp_body).to.contains('Cannot GET /');
    });

    it('should responds to req._html', async () => {
      ctx.req._html = path.join(__dirname, '../seed/public/other.html');
      await handler(ctx);

      expect(ctx.status_code).to.eql(200);
      expect(ctx.resp_body).to.contains('<h1>It works.</h1>');
    });

    it('should responds to jamrock-runtime.js', async () => {
      ctx.request_path = '/jamrock-runtime.js';
      ctx.path_info = ['jamrock-runtime.js'];
      ctx.req.url = '/jamrock-runtime.js';

      td.when(ctx.send_file(td.matchers.isA(String)))
        .thenDo(() => { ctx.resp_body = 42; });

      await handler(ctx);
      expect(ctx.resp_body).to.eql(42);
      expect(td.explain(ctx.send_file).callCount).to.eql(1);
    });

    it('should responds to /login', async () => {
      ctx.request_path = '/login';
      ctx.path_info = ['login'];
      ctx.req.url = '/login';
      ctx.session = { auth: 1, user: { currentInfo: { email: 'a@b.c' } } };
      ctx.method = 'GET';
      ctx.routes = [{
        path: '/login',
        file: path.join(__dirname, '../seed/build/pages/login.js'),
      }];

      await handler(ctx);
      expect(ctx.current_page).to.eql('login');
      expect(ctx.resp_body).to.contains("Glad you're back!");
      expect(ctx.resp_body).to.contains('>a@b.c</span>');
    });

    it('should responds to /forms', async () => {
      ctx.request_path = '/forms';
      ctx.path_info = ['forms'];
      ctx.req.url = '/forms';
      ctx.session = {};
      ctx.method = 'GET';
      ctx.routes = [{
        path: '/forms',
        file: path.join(__dirname, '../seed/build/pages/forms.js'),
      }];
      ctx.cache = {
        del: () => null,
        get: () => null,
      };
      ctx.socket = null;
      ctx.is_xhr = true;

      await handler(ctx);

      const a = ctx.resp_body.markup.body;

      ctx.method = 'POST';
      ctx.body_params = {
        'form-identifier': 'test',
        input: '42',
        f: 'bar',
        a: '4',
        b: '4',
      };
      delete ctx.socket;
      await handler(ctx);
      const b = ctx.resp_body.markup.body;

      expect(a).not.to.eql(b);
    });
  });
});
