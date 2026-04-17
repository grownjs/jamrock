/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`RPC async functions`
  .page`http://localhost:3000/rpc-async`;

test('skip: should render the RPC page', async t => {
  await t.expect($('h1').textContent).contains('RPC Test');
});