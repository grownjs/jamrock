/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`RPC async functions`
  .page`http://localhost:3000/rpc-async`;

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
