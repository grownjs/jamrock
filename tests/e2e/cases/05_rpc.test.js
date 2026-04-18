/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`RPC async functions`
  .page`http://localhost:8080/rpc-async`
  .before(async () => {
    await new Promise(r => setTimeout(r, 1000));
  });

test('should render the RPC page', async t => {
  await t.expect($('h1').textContent).contains('RPC Test');
});

test('should have increment button', async t => {
  await t.expect($('@increment').exists).ok();
});

test('should have decrement button', async t => {
  await t.expect($('@decrement').exists).ok();
});

test('should have reset button', async t => {
  await t.expect($('@reset').exists).ok();
});

test('should increment server count on click', async t => {
  await t.click($('@increment'));
  await t.wait(1000);
  await t.expect($('@server-count').exists).ok();
});

test('should decrement server count on click', async t => {
  await t.click($('@increment'));
  await t.wait(500);
  await t.click($('@decrement'));
  await t.wait(500);
  const count = await $('@server-count').textContent;
  await t.expect(count).contains('0');
});

test('should reset server count on click', async t => {
  await t.click($('@increment'));
  await t.wait(100);
  await t.click($('@reset'));
  await t.wait(100);
  const countAfterReset = await $('@server-count').textContent;
  await t.expect(countAfterReset).contains('0');
});
