/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`RPC async functions`
  .page`http://localhost:3000/rpc-async`;

test('should render the home page', async t => {
  await t.expect($('body').exists).ok();
});