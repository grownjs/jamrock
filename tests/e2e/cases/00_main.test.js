/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`Homepage`
  .page`http://localhost:3000`;

test('should render the homepage', async t => {
  await t.expect($('@debug').exists).notOk();
  await t.expect($('body').exists).ok();
  await t.expect($('h1').textContent).contains('Hello World');
});
