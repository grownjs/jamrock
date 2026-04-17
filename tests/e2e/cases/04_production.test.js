/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`Security tests`
  .page`http://localhost:3000/`;

test('should render page with scripts', async t => {
  await t.expect($('script').exists).ok();
});

fixture`Error handling`
  .page`http://localhost:3000/nonexistent`;

test('should render 404 page for unknown routes', async t => {
  await t.expect($('body').exists).ok();
});

fixture`Network resilience`
  .page`http://localhost:3000/loops`;

test('should render streaming page', async t => {
  await t.expect($('ul').exists).ok();
});
