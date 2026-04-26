/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`RPC async functions`
  .page`http://localhost:3000/rpc-async`
  .before(async () => {
    await new Promise(r => setTimeout(r, 1000));
  });

fixture`Fragment counter via SSE`
  .page`http://localhost:3000/rpc-async`;

test('should render the fragment counter with initial value', async t => {
  await t.expect($('@fragment-count').exists).ok();
  await t.expect($('@fragment-count').innerText).eql('0');
});

test('increment updates counter in-place via SSE without page reload', async t => {
  const before = await $('@fragment-count').innerText;

  await t.click($('@fragment-increment'));

  await t
    .expect($('@fragment-count').innerText)
    .eql(String(Number(before) + 1), { timeout: 3000 });

  // No navigation happened — URL is still /rpc-async
  await t.expect(t.eval(() => location.pathname)).eql('/rpc-async');
});

test('decrement updates counter in-place via SSE', async t => {
  // Start from a known state
  await t.click($('@fragment-reset'));
  await t.expect($('@fragment-count').innerText).eql('0', { timeout: 3000 });

  await t.click($('@fragment-increment'));
  await t.expect($('@fragment-count').innerText).eql('1', { timeout: 3000 });

  await t.click($('@fragment-decrement'));
  await t.expect($('@fragment-count').innerText).eql('0', { timeout: 3000 });
});

test('multiple increments accumulate correctly', async t => {
  await t.click($('@fragment-reset'));
  await t.expect($('@fragment-count').innerText).eql('0', { timeout: 3000 });

  await t.click($('@fragment-increment'));
  await t.click($('@fragment-increment'));
  await t.click($('@fragment-increment'));

  await t.expect($('@fragment-count').innerText).eql('3', { timeout: 3000 });
});
