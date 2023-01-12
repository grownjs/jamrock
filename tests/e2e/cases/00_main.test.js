/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`Home page`
  .page`http://localhost:3000`;

test('should render the home page', async t => {
  await t.expect($('@debug').exists).notOk();
  await t.expect($('body').exists).ok();
  await t.expect($('h1').textContent).contains('It works.');
});

const now = new Date().toISOString();

fixture`Error pages: 404`
  .page`http://localhost:3000/${now}`;

test('should render an error page', async t => {
  await t.expect($('@debug').exists).notOk();
  await t.expect($('body').exists).ok();
  await t.expect($('p').textContent).contains(`Request to GET /${now} not allowed.`);
});
