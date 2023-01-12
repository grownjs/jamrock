import s from 'tiny-dedent';
import glob from 'fast-glob';
import * as path from 'path';
import * as fs from 'fs';

import Grown from 'grown';
import GrownTest from '@grown/test';
import GrownConn from '@grown/conn';

import { serverComponent } from '../../src/render/ssr.mjs';
import { highlight, stringify, debug } from '../../src/templ/utils.mjs';
import { renderAsync, resolveRecursively } from '../../src/render/async.mjs';
import { createTranspiler } from '../../src/server/shared.mjs';
import { renderSync } from '../../src/render/sync.mjs';
import { taggify } from '../../src/markup/index.mjs';
import { Template } from '../../src/templ/main.mjs';
import { get } from '../../src/templ/compile.mjs';

const cwd = process.cwd();

export function flatten(v) {
  return Array.isArray(v)
    ? v.reduce((memo, x) => memo.concat(flatten(x)), []).filter(x => x && String(x).trim().length > 0)
    : v;
}

export function render(block, data, _async) {
  if (_async) {
    return renderAsync(block, data).catch(e => {
      block.failure = debug(block, e);
      return null;
    });
  }
  try {
    return renderSync(block, data);
  } catch (e) {
    block.failure = debug(block, e);
    return null;
  }
}

let count = 0;
export async function loader(code) {
  const mod = `${cwd}/generated/${count++}.mjs`;

  fs.writeFileSync(mod, code);
  return import(mod).then(x => {
    fs.unlinkSync(mod);
    return x.default;
  });
}

export async function load(ctx, chunk) {
  const self = { Jamrock: { Runtime: ctx } };
  const mod = {};

  let code = chunk.content;
  let out;
  let fn;
  try {
    if (chunk.server) {
      out = await loader(code);
    } else {
      code = code.replace(/\nexport\s*\{\s*([^;]+)\s*\};/, (_, $1) => {
        return `\nreturn { ${$1.split(' as ').reverse().map(x => x.trim()).join(': ')} }`;
      }).replace('export default', 'module.exports=').replace(/unwrap`([^]*?)`\.end/g, '$1');

      if (process.debug) {
        console.log('-----------------------');
        console.log(chunk.src);
        console.log('-----------------------');
        console.log(highlight(code, 'js'));
      }

      // eslint-disable-next-line no-new-func
      fn = new Function('module,window', code);
      out = fn(mod, self) || mod.exports;
      out.destination = 'generated/tpl.cjs';
    }
  } catch (e) {
    console.log(highlight(code, 'js'));
    throw e;
  }
  return out;
}

export async function view(src, props, shared, callback) {
  const results = await get(src, null, { auto: true });
  const [head, ...tail] = results;
  const ctx = shared || {};

  ctx.template = Template.read(head.src);
  ctx.route = ctx.route || {};

  for (let i = 0; i < tail.length; i += 1) {
    if (tail[i].client) continue;
    Template.cache.set(tail[i].src, { ...tail[i], module: await load(ctx, tail[i]) });
  }

  Template.cache.set(src, { ...head, module: await load(ctx, head) });

  if (callback === false) return Template.cache.get(src).module;
  return Template.resolve(Template.cache.get(src).module, 'generated/tpl.cjs', ctx, props, callback);
}

const backup = { ...Template };

export function setup() {
  Template.glob = x => glob.sync(x);
  Template.read = x => fs.readFileSync(x).toString();
  Template.write = (f, x) => fs.writeFileSync(f, x);
  Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();
  Template.transpile = createTranspiler({ createMortero: () => import('mortero'), path });
}

export function reset() {
  delete Template.cache;
  Template.glob = backup.glob;
  Template.read = backup.read;
  Template.write = backup.write;
  Template.exists = backup.exists;
  Template.transpile = backup.transpile;
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
  const [file, ...result] = text.split('\n');
  const dest = file.replace(/^\./, `${cwd}/generated`);
  const out = s(result.join('\n'));

  if (!dest) throw new Error('Missing fixture path');

  const dir = path.dirname(dest);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dest, out);
}

fixture.bundle = async (src, props) => {
  setup();

  try {
    const ctx = {};
    const file = `generated/${src}`;
    const deps = await get(file, props, { auto: true });

    for (const dep of deps) {
      let module = await load({ template: Template.read(dep.src) }, dep);
      module = module.default || module;
      Template.cache.set(dep.src, { module });
    }

    return async (params = {}) => {
      const _render = (_chunk, locals) => {
        if (typeof _chunk !== 'function') {
          if (_chunk.$$render || _chunk.resolve) {
            return serverComponent(ctx, _chunk, locals, null, _render, Template.load);
          }
          return renderSync(_chunk, locals, _render);
        }
        throw new Error('Not implemented!!');
      };

      const children = await serverComponent(ctx, Template.cache.get(file).module, null, params, _render, Template.load);
      const result = taggify(await resolveRecursively(children));
      reset();
      return result;
    };
  } catch {
    reset();
  }
};

fixture.partial = async (src, props, shared, callback) => {
  setup();

  try {
    const result = await view(`generated/${src}`, props, shared, callback);

    if (callback === false) return result;
    if (result.status) shared.conn.res.statusCode = result.status;
    return stringify(result, shared ? shared.write : undefined);
  } finally {
    reset();
  }
};
