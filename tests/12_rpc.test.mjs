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

  test('should preserve argument types through RPC call', async ({ expect }) => {
    fixture.fromFile('rpc/echo+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/echo+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/echo+page.generated.mjs`);

    const complexArgs = {
      n: 42,
      s: 'hi',
      b: true,
      nil: null,
      arr: [1, 2],
      nested: { a: { b: 1 } },
    };

    const result = await mod.echo(complexArgs);

    expect(result.n).toBe(42);
    expect(result.s).toBe('hi');
    expect(result.b).toBe(true);
    expect(result.nil).toBe(null);
    expect(result.arr).toEqual([1, 2]);
    expect(result.nested).toEqual({ a: { b: 1 } });
  });
});

test.group('Todo List RPC', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    reset();
  });

  test('should add item to todo list', async ({ expect }) => {
    fixture.fromFile('rpc/todo+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/todo+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/todo+page.generated.mjs`);

    const result = await mod.addItem('Buy milk');

    expect(result.text).toBe('Buy milk');
    expect(result.completed).toBe(false);
    expect(result.id).toBeDefined();
  });

  test('should toggle todo item completion', async ({ expect }) => {
    fixture.fromFile('rpc/todo+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/todo+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/todo+page.generated.mjs`);

    const added = await mod.addItem('Toggle test');
    const toggled = await mod.toggleItem(added.id);

    expect(toggled.completed).toBe(true);
    expect(toggled.id).toBe(added.id);
  });

  test('should remove item from todo list', async ({ expect }) => {
    fixture.fromFile('rpc/todo+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/todo+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/todo+page.generated.mjs`);

    const added = await mod.addItem(`To remove ${Date.now()}`);
    const listBefore = await mod.listItems();
    const beforeCount = listBefore.length;

    const removed = await mod.removeItem(added.id);
    expect(removed.ok).toBe(true);

    const listAfter = await mod.listItems();
    expect(listAfter.length).toBe(beforeCount - 1);
  });

  test('should list all items', async ({ expect }) => {
    fixture.fromFile('rpc/todo+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/todo+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/todo+page.generated.mjs`);

    await mod.addItem(`List test ${Date.now()}`);
    await mod.addItem(`List test 2 ${Date.now()}`);

    const list = await mod.listItems();
    expect(list.length).toBeGreaterThan(1);
  });

  test('should clear completed items', async ({ expect }) => {
    fixture.fromFile('rpc/todo+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/todo+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/todo+page.generated.mjs`);

    const completed = await mod.addItem(`Clear test ${Date.now()}`);
    await mod.toggleItem(completed.id);

    const result = await mod.clearCompleted();
    expect(result.removed).toBeGreaterThanOrEqual(1);
  });
});

test.group('Calculator RPC', t => {
  t.each.setup(() => {
    setup();
  });
  t.each.teardown(() => {
    process.debug = 0;
    reset();
  });

  test('should add numbers', async ({ expect }) => {
    fixture.fromFile('rpc/calc+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/calc+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/calc+page.generated.mjs`);

    const result = await mod.add(10, 5);
    expect(result).toBe(15);
  });

  test('should subtract numbers', async ({ expect }) => {
    fixture.fromFile('rpc/calc+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/calc+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/calc+page.generated.mjs`);

    const result = await mod.subtract(10, 5);
    expect(result).toBe(5);
  });

  test('should multiply numbers', async ({ expect }) => {
    fixture.fromFile('rpc/calc+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/calc+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/calc+page.generated.mjs`);

    const result = await mod.multiply(10, 5);
    expect(result).toBe(50);
  });

  test('should divide numbers', async ({ expect }) => {
    fixture.fromFile('rpc/calc+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/calc+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/calc+page.generated.mjs`);

    const result = await mod.divide(10, 5);
    expect(result).toBe(2);
  });

  test('should throw on divide by zero', async ({ expect }) => {
    fixture.fromFile('rpc/calc+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/calc+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/calc+page.generated.mjs`);

    await expect(mod.divide(10, 0)).rejects.toThrow('Cannot divide by zero');
  });

  test('should calculate power', async ({ expect }) => {
    fixture.fromFile('rpc/calc+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/calc+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/calc+page.generated.mjs`);

    const result = await mod.power(2, 8);
    expect(result).toBe(256);
  });

  test('should calculate square root', async ({ expect }) => {
    fixture.fromFile('rpc/calc+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/calc+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/calc+page.generated.mjs`);

    const result = await mod.sqrt(16);
    expect(result).toBe(4);
  });

  test('should store and recall memory', async ({ expect }) => {
    fixture.fromFile('rpc/calc+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/calc+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/calc+page.generated.mjs`);

    await mod.store(42);
    const result = await mod.recall();
    expect(result).toBe(42);

    await mod.clearMemory();
    const cleared = await mod.recall();
    expect(cleared).toBe(0);
  });
});

test.group('Poll/Voting RPC', t => {
  t.each.setup(() => { setup(); });
  t.each.teardown(() => { process.debug = 0; reset(); });

  test('should create a poll', async ({ expect }) => {
    fixture.fromFile('rpc/poll+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/poll+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/poll+page.generated.mjs`);

    const poll = await mod.createPoll(`Best ${Date.now()}`, ['JS', 'Python', 'Rust']);
    expect(poll.question).toContain('Best');
    expect(poll.options).toEqual(['JS', 'Python', 'Rust']);
    expect(poll.id).toBeDefined();
  });

  test('should vote on poll', async ({ expect }) => {
    fixture.fromFile('rpc/poll+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/poll+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/poll+page.generated.mjs`);

    const poll = await mod.createPoll(`Test ${Date.now()}`, ['A', 'B']);
    const result = await mod.vote(poll.id, 'A');
    expect(result.ok).toBe(true);
    expect(result.votes.A).toBe(1);
  });

  test('should get poll results', async ({ expect }) => {
    fixture.fromFile('rpc/poll+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/poll+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/poll+page.generated.mjs`);

    const poll = await mod.createPoll(`Test ${Date.now()}`, ['X', 'Y']);
    await mod.vote(poll.id, 'X');
    await mod.vote(poll.id, 'X');
    await mod.vote(poll.id, 'Y');

    const results = await mod.getResults(poll.id);
    expect(results.total).toBe(3);
    expect(results.results.X.count).toBe(2);
  });

  test('should list polls', async ({ expect }) => {
    fixture.fromFile('rpc/poll+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/poll+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/poll+page.generated.mjs`);

    await mod.createPoll(`Poll ${Date.now()}1`, ['A']);
    await mod.createPoll(`Poll ${Date.now()}2`, ['B']);

    const list = await mod.listPolls();
    expect(list.length).toBeGreaterThan(0);
  });
});

test.group('Shopping Cart RPC', t => {
  t.each.setup(() => { setup(); });
  t.each.teardown(() => { process.debug = 0; reset(); });

  test('should get products', async ({ expect }) => {
    fixture.fromFile('rpc/cart+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/cart+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/cart+page.generated.mjs`);

    const products = await mod.getProducts();
    expect(products.length).toBe(5);
    expect(products[0].name).toBe('Apple');
  });

  test('should add to cart', async ({ expect }) => {
    fixture.fromFile('rpc/cart+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/cart+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/cart+page.generated.mjs`);

    await mod.clearCart();
    const result = await mod.addToCart(1, 3);
    expect(result.ok).toBe(true);
    expect(result.cart[0].quantity).toBe(3);
  });

  test('should calculate total', async ({ expect }) => {
    fixture.fromFile('rpc/cart+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/cart+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/cart+page.generated.mjs`);

    await mod.clearCart();
    await mod.addToCart(1, 2);
    await mod.addToCart(2, 1);

    const total = await mod.getTotal();
    expect(total).toBeGreaterThan(0);
  });

  test('should checkout', async ({ expect }) => {
    fixture.fromFile('rpc/cart+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/cart+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/cart+page.generated.mjs`);

    await mod.clearCart();
    await mod.addToCart(1);
    const result = await mod.checkout();

    expect(result.ok).toBe(true);
    expect(result.order.id).toBeDefined();
  });
});

test.group('Chat/Messages RPC', t => {
  t.each.setup(() => { setup(); });
  t.each.teardown(() => { process.debug = 0; reset(); });

  test('should create a room', async ({ expect }) => {
    fixture.fromFile('rpc/chat+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/chat+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/chat+page.generated.mjs`);

    const room = await mod.createRoom('General');
    expect(room.name).toBe('General');
    expect(room.id).toBeDefined();
  });

  test('should join and leave room', async ({ expect }) => {
    fixture.fromFile('rpc/chat+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/chat+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/chat+page.generated.mjs`);

    const room = await mod.createRoom('Test');
    const join = await mod.joinRoom(room.id, 'Alice');
    expect(join.ok).toBe(true);
    expect(join.users).toContain('Alice');

    const leave = await mod.leaveRoom(room.id, 'Alice');
    expect(leave.ok).toBe(true);
  });

  test('should send and retrieve messages', async ({ expect }) => {
    fixture.fromFile('rpc/chat+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/chat+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/chat+page.generated.mjs`);

    const room = await mod.createRoom('Test');
    await mod.sendMessage(room.id, 'Alice', 'Hello!');

    const messages = await mod.getMessages(room.id);
    expect(messages.length).toBe(1);
    expect(messages[0].text).toBe('Hello!');
  });
});

test.group('Tic-Tac-Toe RPC', t => {
  t.each.setup(() => { setup(); });
  t.each.teardown(() => { process.debug = 0; reset(); });

  test('should create a game', async ({ expect }) => {
    fixture.fromFile('rpc/tictactoe+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/tictactoe+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/tictactoe+page.generated.mjs`);

    const game = await mod.createGame('Alice', 'Bob');
    expect(game.id).toBeDefined();
    expect(game.currentPlayer).toBe('X');
    expect(game.board.every(c => c === null)).toBe(true);
  });

  test('should make moves', async ({ expect }) => {
    fixture.fromFile('rpc/tictactoe+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/tictactoe+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/tictactoe+page.generated.mjs`);

    const game = await mod.createGame('Alice', 'Bob');
    const move = await mod.makeMove(game.id, 'X', 0);
    expect(move.ok).toBe(true);
    expect(move.board[0]).toBe('X');
  });

  test('should detect win', async ({ expect }) => {
    fixture.fromFile('rpc/tictactoe+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/tictactoe+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/tictactoe+page.generated.mjs`);

    const game = await mod.createGame('Alice', 'Bob');
    await mod.makeMove(game.id, 'X', 0);
    await mod.makeMove(game.id, 'O', 3);
    await mod.makeMove(game.id, 'X', 1);
    await mod.makeMove(game.id, 'O', 4);
    const final = await mod.makeMove(game.id, 'X', 2);

    expect(final.winner).toBe('X');
  });

  test('should detect draw', async ({ expect }) => {
    fixture.fromFile('rpc/tictactoe+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/tictactoe+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/tictactoe+page.generated.mjs`);

    const game = await mod.createGame('Alice', 'Bob');
    const moves = [[0, 'X'], [1, 'O'], [2, 'X'], [4, 'O'], [3, 'X'], [5, 'O'], [7, 'X'], [6, 'O'], [8, 'X']];
    for (const [pos, player] of moves) {
      const result = await mod.makeMove(game.id, player, pos);
      if (result.winner) break;
    }

    const final = await mod.getGame(game.id);
    expect(final.winner).toBe('draw');
  });
});

test.group('Recursive Comments RPC', t => {
  t.each.setup(() => { setup(); });
  t.each.teardown(() => { process.debug = 0; reset(); });

  test('should add a top-level comment', async ({ expect }) => {
    fixture.fromFile('rpc/comments+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/comments+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/comments+page.generated.mjs`);

    const comment = await mod.addComment('First comment!', 'Alice');
    expect(comment.text).toBe('First comment!');
    expect(comment.author).toBe('Alice');
    expect(comment.parentId).toBeNull();
  });

  test('should add a nested reply', async ({ expect }) => {
    fixture.fromFile('rpc/comments+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/comments+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/comments+page.generated.mjs`);

    const parent = await mod.addComment('Parent comment', 'Bob');
    const reply = await mod.addComment('Reply to parent', 'Carol', parent.id);

    expect(reply.parentId).toBe(parent.id);
    expect(reply.text).toBe('Reply to parent');
  });

  test('should get recursive thread', async ({ expect }) => {
    fixture.fromFile('rpc/comments+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/comments+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/comments+page.generated.mjs`);

    const root = await mod.addComment('Root comment', 'Dave');
    const reply1 = await mod.addComment('First reply', 'Eve', root.id);
    const reply2 = await mod.addComment('Second reply', 'Frank', root.id);
    await mod.addComment('Reply to first', 'Grace', reply1.id);

    const thread = await mod.getThread(root.id);

    expect(thread.text).toBe('Root comment');
    expect(thread.replies.length).toBe(2);
    expect(thread.replies[0].replies.length).toBe(1);
  });

  test('should delete comment and its children', async ({ expect }) => {
    fixture.fromFile('rpc/comments+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/comments+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/comments+page.generated.mjs`);

    const parent = await mod.addComment('To delete', 'Hank');
    const child = await mod.addComment('Child comment', 'Ivy', parent.id);

    await mod.deleteComment(parent.id);

    const deletedParent = await mod.getComment(parent.id);
    const deletedChild = await mod.getComment(child.id);

    expect(deletedParent).toBeNull();
    expect(deletedChild).toBeNull();
  });

  test('should edit comment', async ({ expect }) => {
    fixture.fromFile('rpc/comments+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/comments+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/comments+page.generated.mjs`);

    const comment = await mod.addComment('Original text', 'Jack');
    await mod.editComment(comment.id, 'Updated text');

    const updated = await mod.getComment(comment.id);
    expect(updated.text).toBe('Updated text');
    expect(updated.editedAt).toBeDefined();
  });

  test('should search comments', async ({ expect }) => {
    fixture.fromFile('rpc/comments+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/comments+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/comments+page.generated.mjs`);

    await mod.addComment(`unique keyword test ${Date.now()}`, 'Kate');
    await mod.addComment(`No keyword here ${Date.now()}`, 'Leo');
    await mod.addComment(`Another keyword test ${Date.now()}`, 'Mike');

    const results = await mod.searchComments('keyword');
    expect(results.length).toBeGreaterThanOrEqual(2);
});

test('should get comments by author', async ({ expect }) => {
    fixture.fromFile('rpc/comments+page.html');
    const ctx = useContext();
    await fixture.partial('rpc/comments+page.html', null, ctx);

    const cwd = process.cwd();
    const mod = await import(`file://${cwd}/generated/rpc/comments+page.generated.mjs`);

    await mod.addComment('Comment 1', 'Nancy');
    await mod.addComment('Comment 2', 'Nancy');
    await mod.addComment('Comment 3', 'Other');

    const results = await mod.getCommentsByAuthor('Nancy');
    expect(results.length).toBe(2);
  });
});

test.group('dispatch trigger', () => {
  test('should ignore non-rpc payloads', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    const messages = [];
    const ws = { identity: 'test-uuid', send: (msg) => { messages.push(msg); } };
    const result = dispatch('hello world', ws, {}, null);

    expect(result).toBeUndefined();
    expect(messages.length).toBe(0);
  });

  test('should return welcome on reconnect', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    const ws = { identity: 'test-uuid', send: () => {} };
    const result = dispatch('rpc:reconnect new-uuid', ws, {}, null);

    expect(result.welcome).toBe('welcome new-uuid');
    expect(ws.identity).toBe('new-uuid');
  });

  test('should return welcome on connect', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    const ws = { identity: 'test-uuid', send: () => {} };
    const result = dispatch('rpc:connect new-uuid my-source', ws, {}, null);

    expect(result.welcome).toBe('welcome new-uuid');
    expect(ws.identity).toBe('new-uuid');
    expect(ws.source).toBe('my-source');
  });

  test('should dispose on disconnect message', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    const ws = { identity: 'test-uuid', send: () => {} };
    const result = dispatch('rpc:disconnect', ws, {}, null);

    expect(result.dispose).toBe(true);
  });

  test('should invoke handler function and dirty-check state changes', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    let handlerCalled = false;
    let handlerPayload = null;
    const state = { count: 0, items: ['a'] };

    const mockFn = (payload) => {
      handlerCalled = true;
      handlerPayload = payload;
      state.count++;
      state.items.push('b');
    };

    const mockModule = {
      __rpc_fns: { addComment: mockFn },
      __functions: {},
      __handler: () => {
        const __context = () => ({
          __callback: () => state,
        });
        return { __context };
      },
      __fragments: {
        'live-comments': { s: ['items'], r: () => [], a: () => ({}) },
      },
    };

    const env = {
      locate: _src => {
        if (_src === 'components/comments') return mockModule;
        throw new Error(`Module not found: ${_src}`);
      },
    };

    const messages = [];
    const ws = { identity: 'test-uuid', send: (msg) => { messages.push(msg); }, module: mockModule };

    dispatch('rpc:trigger test-uuid components/comments click addComment:null\tmessage=hello&message_id=1', ws, env, null);

    expect(handlerCalled).toBe(true);
    expect(handlerPayload.message_id).toBe('1');
    expect(handlerPayload.message).toBe('hello');
  });

  test('should detect state changes and find affected fragments', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    const messages = [];
    const ws = { identity: 'test-uuid', send: (msg) => { messages.push(msg); } };

    const state = { items: ['a'] };

    const mockFn = () => {
      state.items.push('b');
    };

    const mockModule = {
      __rpc_fns: { updateComments: mockFn },
      __functions: {},
      __handler: () => {
        const __context = () => ({
          __callback: () => state,
        });
        return { __context };
      },
      __fragments: {
        'live-comments': { s: ['items'], r: () => ['div', {}, ['updated']], a: () => ({}) },
      },
      __src: 'test/comments.html',
    };

    const env = { locate: () => mockModule };
    ws.module = mockModule;

    dispatch('rpc:trigger test-uuid components/comments click updateComments:null\tmessage=test', ws, env, null);

    expect(state.items).toEqual(['a', 'b']);
  });

  test('should not send updates when no state changes', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    const messages = [];
    const ws = { identity: 'test-uuid', send: (msg) => { messages.push(msg); } };

    const state = { count: 0 };

    const mockFn = () => {
      // no mutation
    };

    const mockModule = {
      __rpc_fns: { noMutate: mockFn },
      __functions: {},
      __handler: () => {
        const __context = () => ({
          __callback: () => state,
        });
        return { __context };
      },
      __fragments: {
        'live-comments': { s: ['count'], r: () => [], a: () => ({}) },
      },
    };

    const env = { locate: () => mockModule };
    ws.module = mockModule;

    dispatch('rpc:trigger test-uuid components/comments click noMutate:null\t', ws, env, null);

    await new Promise(r => setTimeout(r, 50));

    expect(messages.length).toBe(0);
  });

  test('should fall back to __functions when __rpc_fns does not have the function', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    let handlerCalled = false;
    const mockFn = () => { handlerCalled = true; };

    const mockModule = {
      __rpc_fns: {},
      __functions: { doSomething: mockFn },
      __handler: () => {
        const __context = () => ({
          __callback: () => ({}),
        });
        return { __context };
      },
      __fragments: {},
    };

    const env = { locate: () => mockModule };

    const ws = { identity: 'test-uuid', send: () => {}, module: mockModule };

    dispatch('rpc:trigger test-uuid components/comments click doSomething:null\tdata=value', ws, env, null);

    expect(handlerCalled).toBe(true);
  });

  test('should not invoke handler for mismatched uuid', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    let handlerCalled = false;
    const mockFn = () => { handlerCalled = true; };

    const mockModule = {
      __rpc_fns: { testFn: mockFn },
      __functions: {},
    };

    const env = { locate: () => mockModule };

    const ws = { identity: 'correct-uuid', send: () => {} };
    dispatch('rpc:trigger wrong-uuid components/comments click testFn:null\t', ws, env, null);

    expect(handlerCalled).toBe(false);
  });

  test('should use ws.context when available', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    let emitted = false;
    let emittedData = null;
    const context = {
      emit: (data, ..._args) => {
        emitted = true;
        emittedData = data;
      },
    };

    const ws = { identity: 'test-uuid', send: () => {}, context };

    dispatch('rpc:trigger test-uuid some/ref click fn:null\tkey=val', ws, {}, null);

    expect(emitted).toBe(true);
    expect(emittedData).toContain('key=val');
  });

  test('should use ws.module when available instead of env.locate', async ({ expect }) => {
    const { dispatch } = await import('../src/handler/dispatch.ts');

    let handlerCalled = false;
    const mockFn = () => { handlerCalled = true; };

    const mockModule = {
      __rpc_fns: { testFn: mockFn },
      __functions: {},
      __handler: () => {
        const __context = () => ({
          __callback: () => ({}),
        });
        return { __context };
      },
      __fragments: {},
    };

    const ws = { identity: 'test-uuid', send: () => {}, module: mockModule };

    dispatch('rpc:trigger test-uuid components/comments click testFn:null\t', ws, {}, null);

    expect(handlerCalled).toBe(true);
  });
});