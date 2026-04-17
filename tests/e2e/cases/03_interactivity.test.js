/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`Fragments and live patching`
  .page`http://localhost:3000/loops`;

test('should render fragment with generator values', async t => {
  await t.expect($('@debug').exists).notOk();
  await t.expect($('[data-fragment=loop]').exists).ok();
  await t.expect($('ul > li').count).gte(3);
});

test('should stream values to fragment', async t => {
  await t.expect($('ul > li').count).gte(5);
});

fixture`Bindings`
  .page`http://localhost:3000/binds`;

test('should render bound inputs', async t => {
  await t.expect($('input[type=range]').exists).ok();
  await t.expect($('input[required]').exists).ok();
  await t.expect($('p').textContent).contains('Got:');
});

fixture`Events`
  .page`http://localhost:3000/demo`;

test('should render interactive form', async t => {
  await t.expect($('form').exists).ok();
  await t.expect($('input[type=submit]').exists).ok();
});

fixture`Forms`
  .page`http://localhost:3000/forms`;

test('should render form with validation', async t => {
  await t.expect($('form').exists).ok();
  await t.expect($('input[name=emailaddr]').exists).ok();
});
