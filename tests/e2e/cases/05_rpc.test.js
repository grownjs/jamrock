/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`RPC async functions`
  .page`http://localhost:3000/rpc-async`;

test('should render the RPC page', async t => {
  await t.expect($('h1').textContent).contains('RPC Test');
});

test('should have initial server count of 0', async t => {
  const count = await t.eval(() => document.querySelector('[data-test-id="server-count"]').textContent);
  await t.expect(count).toEql('0');
});

test('should increment server count via form submission', async t => {
  await t.click('[data-test-id="increment"]');
  await t.wait(300);

  const count = await t.eval(() => document.querySelector('[data-test-id="server-count"]').textContent);
  await t.expect(count).toEql('1');
});

test('should decrement server count via form submission', async t => {
  await t.click('[data-test-id="increment"]');
  await t.wait(100);
  await t.click('[data-test-id="increment"]');
  await t.wait(100);
  await t.click('[data-test-id="decrement"]');
  await t.wait(300);

  const count = await t.eval(() => document.querySelector('[data-test-id="server-count"]').textContent);
  await t.expect(count).toEql('1');
});