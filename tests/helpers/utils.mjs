import s from 'tiny-dedent';
import glob from 'glob';
import fs from 'fs-extra';
import * as path from 'path';

import Mortero from 'mortero';
import Grown from 'grown';
import GrownTest from '@grown/test';
import GrownConn from '@grown/conn';

import {
  useRef, useEffect, useState, onError,
} from '../../src/client/runtime.mjs';

import * as store from '../../src/reactor/store.mjs';
import { renderComponent, resolveRecursively } from '../../src/render/ssr.mjs';
import { highlight, stringify, debug } from '../../src/templ/utils.mjs';
import { renderSync, renderAsync } from '../../src/render/shared.mjs';
import { createTranspiler } from '../../lib/shared.mjs';
import { taggify } from '../../src/markup/index.mjs';
import { Template } from '../../src/templ/main.mjs';
import { get } from '../../src/templ/compile.mjs';

const cwd = process.cwd();

const registeredComponents = {};
const registerComponent = (ref, chunk) => {
  registeredComponents[ref] = chunk;
  return chunk;
};
const importComponent = ref => {
  return registeredComponents[ref];
};

const runtime = {
  useRef,
  useState,
  useEffect,
  onError,
  importComponent,
  registerComponent,
};

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
  const self = { Jamrock: { Browser: { _: ctx } } };
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
      }).replace(/unwrap`([^]*?)`\.end/g, '$1');

      // eslint-disable-next-line no-new-func
      fn = new Function('module,window', code);
      out = fn(mod, self) || mod.exports;
    }
  } catch (e) {
    console.log(highlight(code, 'js'));
    throw e;
  }
  return out;
}

export async function view(src, props, shared, callback) {
  const results = await get(src, null, true);
  const [head, ...tail] = results;
  const ctx = shared || {};

  Object.defineProperty(ctx, 'template', { value: Template.read(head.src), configurable: true });

  for (let i = 0; i < tail.length; i += 1) {
    // eslint-disable-next-line no-continue
    if (tail[i].client) continue;
    Template.cache.set(tail[i].src, { ...tail[i], module: await load(ctx, tail[i]) });
  }

  Template.cache.set(src, { ...head, module: await load(ctx, head) });

  return Template.resolve(Template.cache.get(src).module, 'generated/tpl.cjs', ctx, props, callback);
}

const backup = { ...Template };

export function setup() {
  Template.cache = new Map();
  Template.cache.set('jamrock', { module: runtime });
  Template.cache.set('jamrock/store', { module: store });

  Template.glob = x => glob.sync(x);
  Template.read = x => fs.readFileSync(x).toString();
  Template.write = (f, x) => fs.writeFileSync(f, x);
  Template.exists = x => fs.existsSync(x) && fs.statSync(x).isFile();
  Template.transpile = createTranspiler({ Mortero, path });
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
  fs.outputFileSync(dest, out);
}

fixture.bundle = async (src, props) => {
  setup();

  try {
    const file = `generated/${src}`;
    const deps = await get(file, props, true);

    for (const dep of deps) {
      const ctx = Object.assign(runtime, { template: Template.read(dep.src) });
      const module = await load(ctx, dep);

      Template.cache.set(dep.src, { module });
    }

    return async (params = {}) => {
      const _render = (_chunk, locals) => {
        if (typeof _chunk !== 'function') {
          if (_chunk.$$render || _chunk.component) {
            return renderComponent(_chunk, { ...locals }, null, _render);
          }
          return renderSync(_chunk, { ...locals }, _render);
        }
        throw new Error('Not implemented');
      };
      const children = await renderComponent(importComponent(file), params.props, params, _render);
      return taggify(await resolveRecursively(children));
    };
  } finally {
    reset();
  }
};

fixture.partial = async (src, props, shared, callback) => {
  setup();

  try {
    const result = await view(`generated/${src}`, props, shared, callback);

    return stringify(result, shared ? shared.write : undefined);
  } finally {
    reset();
  }
};
