import s from 'tiny-dedent';
import util from 'util';
import glob from 'fast-glob';
import * as path from 'path';
import * as fs from 'fs';

import Grown from 'grown';
import GrownTest from '@grown/test';
import GrownConn from '@grown/conn';

import { createTranspiler } from '../../src/server/helpers.mjs';
import { stringify, debug } from '../../src/templ/utils.mjs';
import { executeAsync } from '../../src/render/async.mjs';
import { taggify } from '../../src/markup/html.mjs';
import { Template } from '../../src/templ/main.mjs';
import { Block } from '../../src/markup/block.mjs';

util._extend = Object.assign;

const cwd = process.cwd();

export function createView(loader) {
  return executeAsync(loader, async (tpl, props, _loader, _context) => {
    return Promise.resolve(tpl.__handler ? tpl.__handler(props, _loader) : null)
      .then(ctx => (ctx?.__context ? ctx.__context() : { __scope: props }))
      .then(ctx => tpl.__template(_context, ctx.__scope ?? ctx.__callback?.()));
  });
}

let inc = 0;
export async function transpile(code, src, save, prefix = 'generated/') {
  const file = `${cwd}/${prefix}${src.replace('.html', '')}.generated.mjs`;

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Block.unwrap(code, src, file.replace(cwd, '.').replace('./', '')));
  // console.log({src,file,dest:file.replace(cwd, '.').replace('./', '')});

  if (!save) {
    const mod = await import(`${file}?_=${inc++}`);
    return mod;
  }
}

export function flatten(v) {
  return Array.isArray(v)
    ? v.reduce((memo, x) => memo.concat(flatten(x)), []).filter(x => x && String(x).trim().length > 0)
    : v;
}

const TEMPLATE = { ...Template };

export function setup() {
  Template.cache = new Map();
  Template.glob = x => glob.sync(x);
  Template.read = x => fs.readFileSync(x).toString();
  Template.write = (f, x) => fs.writeFileSync(f, x);
  Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();
  Template.transpile = createTranspiler({ createMortero: () => import('mortero'), path });
}

export function reset() {
  delete Template.cache;
  Template.glob = TEMPLATE.glob;
  Template.read = TEMPLATE.read;
  Template.write = TEMPLATE.write;
  Template.exists = TEMPLATE.exists;
  Template.transpile = TEMPLATE.transpile;
}

export function server(callback, ctx) {
  const AppServer = Grown();

  AppServer.use(GrownTest);
  AppServer.use(GrownConn);

  const app = new AppServer();

  app.plug(AppServer.Test, AppServer.Conn);

  if (callback) {
    app.mount(conn => {
      if (ctx && ctx.conn) {
        Object.assign(ctx.conn, {
          req: conn.req,
          res: conn.res,
          method: conn.method,
          path_info: conn.path_info,
          request_path: conn.request_path,
        });
      }
      return callback(conn);
    });
  }
  return app;
}

export function fixture(str, ...splat) {
  const buffer = [];
  for (let i = 0; i < str.length; i += 1) {
    buffer.push(str[i], splat[i]);
  }
  const text = buffer.join('');
  const [filepath, ...result] = text.split('\n');

  const destination = filepath.replace(/^\./, `${cwd}/generated`);
  const source = s(result.join('\n'));

  if (!destination) throw new Error('Missing fixture path');
  fixture[filepath] = { source, filepath, destination };

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, source);
}

export async function generated(block) {
  const filepath = block.src;
  const source = block.code;

  const js = block.toString();

  try {
    const view = createView();
    const mod = await transpile(js, block.dest);

    let ctx;
    const _render = async (props = {}) => {
      try {
        const self = mod.__handler
          ? await mod.__handler(props)
          : null;

        const main = self?.__context ? await self.__context() : null;
        const data = main?.__scope ?? main?.__callback?.();
        const result = await view(mod.__template, { ...props, ...data });

        const html = taggify(result);

        return { html };
      } catch (e) {
        ctx.failure = debug({
          file: block.src,
          html: source,
          code: js,
        }, e);
      }
    };

    ctx = { ...mod, code: js, source, filepath, render: _render };
    return ctx;
  } catch (e) {
    console.log(e);
    const failure = debug({
      file: block.src,
      html: source,
      code: js,
    }, e);
    return { failure, code: js, source, filepath };
  }
}

export async function compile(code, opts) {
  const m = await fixture.load(code, 'source.html', opts);
  return m;
}

export async function render(mod, props) {
  const r = await mod;
  if (r.failure) {
    throw r.failure;
  }
  return r.render(props);
}

export async function build(src, opts) {
  const options = { ...opts, cwd: 'generated', scope: 'jam-420' };

  let mod = await fixture.use(src, options, true);
  mod = Template.from((code, file) => fixture.load(code, file, { raw: true, ...options }), mod, options);
  const mods = await mod.regenerate();

  for (let i = 1; i < mods.length; i++) {
    if (mods[i].dest) transpile(mods[i].content, mods[i].dest, true, '');
  }
  return mod.compile(mods[0], mod.partial, transpile);
}

fixture.partial = async (src, props, shared, callback) => {
  try {
    setup();
    const tpl = await build(`./${src.replace('./', '')}`);
    const out = await Template.resolve(tpl.module, 'generated/tpl.mjs', shared, props, callback);
    if (out.status) shared.conn.res.status(out.status);
    return stringify(out);
  } finally {
    reset();
  }
};

fixture.load = (source, filepath, options = {}) => {
  try {
    const b = new Block(source, filepath, options);

    if (options.raw) return b;

    return generated(b);
  } catch (e) {
    const failure = debug({
      file: filepath,
      html: source,
    }, e);
    return { failure, source, filepath };
  }
};
fixture.get = key => fixture[key];
fixture.use = (key, opts, block) => {
  if (Array.isArray(key)) {
    return Promise.all(key.map(_ => fixture.use(_, opts)));
  }

  const { source, filepath } = fixture.get(key);

  if (block) {
    return new Block(source, filepath, opts);
  }
  return fixture.load(source, filepath, opts);
};
