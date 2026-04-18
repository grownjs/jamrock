/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`RPC async functions`
  .page`http://localhost:3000/rpc-async`
  .before(async () => {
    await new Promise(r => setTimeout(r, 1000));
  });
