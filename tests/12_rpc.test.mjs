import { test } from '@japa/runner';
import * as td from 'testdouble';
import * as path from 'path';

import { streamify } from '../src/templ/send.ts';
import { fixture, setup, reset } from './helpers/utils.mjs';
import { Block } from '../src/markup/block.ts';

function useContext(overrides = {}) {
  const uuid = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ctx = {
    publish: td.func('publish'),
    ...overrides,
  };
  return Object.assign(ctx, {
    stream: streamify().wrap(ctx, uuid),
  });
}

const createMockConn = (method, pathInfo, body = null) => ({
  method,
  path_info: pathInfo,
  req: { body: body || { then: () => null } },
});

const createMockEnv = (modules = {}) => ({
  files: modules,
  options: { prefix: '@' },
});

test.group('__rpc export', () => {
  test('should export empty __rpc for static template', async ({ expect }) => {
    setup();
    const code = '<h1>hello</h1>';
    const block = new Block(code, 'test/static.html', { cwd: '.', dest: '.', generators: {} });

    const result = block.toString();
    expect(result).toContain('export const __rpc = {}');
    expect(result).toContain('export const __rpc_fns = {}');
    expect(result).toContain('__vdom,__rpc,__rpc_fns}');
    reset();
  });

  test('should export async functions in __rpc', async ({ expect }) => {
    setup();
    const code = `<script context="module">
      export async function getData(id) {
        return { id, name: 'test' };
      }

      export async function saveItem(data) {
        return { ok: true, data };
      }

      function notExported() {
        return 'local';
      }

      export function syncFn() {
        return 'sync';
      }
    </script>

    <h1>hello</h1>`;

    const block = new Block(code, 'test/async-rpc.html', { cwd: '.', dest: '.', generators: {} });

    const result = block.toString();

    expect(result).toContain("export const __rpc = {getData:'test/async-rpc',saveItem:'test/async-rpc'}");
    expect(result).toContain('export const __rpc_fns = {getData,saveItem}');
    expect(result).not.toContain("notExported:'test/async-rpc'");
    expect(result).not.toContain("syncFn:'test/async-rpc'");
    reset();
  });

  test('should include __rpc in default export', async ({ expect }) => {
    setup();
    const code = `<script context="module">
      export async function fetchData() {
        return [1, 2, 3];
      }
    </script>

    <div>content</div>`;

    const block = new Block(code, 'test/default-export.html', { cwd: '.', dest: '.', generators: {} });

    const result = block.toString();
    expect(result).toContain('__functions,__rpc,__rpc_fns,__exported,__handler,__routes');
    reset();
  });
});

test.group('.rpc.mjs generation', () => {
  test('should generate rpc stub module', async ({ expect }) => {
    const code = `<script context="module">
      export async function getItem(id) {
        return { id };
      }

      export async function deleteItem(id) {
        return { deleted: id };
      }
    </script>

    <p>test</p>`;

    const block = new Block(code, 'test/rpc-stub.html', { cwd: '.', dest: '.', generators: {} });
    const result = block.toString();

    const lines = result.split('\n');
    const rpcLine = lines.find(l => l.includes('export const __rpc'));

    expect(rpcLine).toContain("getItem:'test/rpc-stub'");
    expect(rpcLine).toContain("deleteItem:'test/rpc-stub'");
  });
});

test.group('createRpcCallResponse', () => {
  test('should export createRpcCallResponse function', async ({ expect }) => {
    setup();
    const { createRpcCallResponse } = await import('../src/server/request.ts');
    expect(typeof createRpcCallResponse).toBe('function');
    reset();
  });

  test('should handle no path segments', async ({ expect }) => {
    setup();
    const { createRpcCallResponse } = await import('../src/server/request.ts');

    const conn = createMockConn('POST', []);
    const env = createMockEnv();

    const resp = await createRpcCallResponse(env, conn);

    expect(resp.status).toBe(400);
    reset();
  });

  test('should handle insufficient path segments', async ({ expect }) => {
    setup();
    const { createRpcCallResponse } = await import('../src/server/request.ts');

    const conn = createMockConn('POST', ['_rpc']);
    const env = createMockEnv();

    const resp = await createRpcCallResponse(env, conn);

    expect(resp.status).toBe(400);
    reset();
  });

  test('should handle missing module path in request', async ({ expect }) => {
    setup();
    const { createRpcCallResponse } = await import('../src/server/request.ts');

    const conn = createMockConn('POST', ['_rpc', 'nonexistent', 'fn']);
    const env = createMockEnv({
      'nonexistent.html': { filepath: 'test/fixtures/nonexistent.html' },
    });

    const resp = await createRpcCallResponse(env, conn);

    expect(resp.status).toBeGreaterThanOrEqual(400);
    reset();
  });

  test('should return 405 for GET request', async ({ expect }) => {
    setup();
    const { createRpcCallResponse } = await import('../src/server/request.ts');

    const conn = createMockConn('GET', ['_rpc', 'test', 'fn']);
    const env = createMockEnv();

    const resp = await createRpcCallResponse(env, conn);

    expect(resp.status).toBe(405);
    reset();
  });
});

test.group('Direct RPC round-trip', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    reset();
  });

test('should echo args back via _rpc endpoint', async ({ expect }) => {
    fixture.fromFile('rpc/echo+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/echo+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/echo+page.generated.mjs`);

    const result = await mod.echo({ n: 42, s: 'hi' });

    expect(result).toEqual({ n: 42, s: 'hi' });
  });

  test('should call add function correctly', async ({ expect }) => {
    fixture.fromFile('rpc/echo+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/echo+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/echo+page.generated.mjs`);

    const result = await mod.add(10, 20);

    expect(result).toBe(30);
  });

  test('should call greet function correctly', async ({ expect }) => {
    fixture.fromFile('rpc/echo+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/echo+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/echo+page.generated.mjs`);

    const result = await mod.greet('World');

    expect(result).toBe('Hello, World!');
  });
});