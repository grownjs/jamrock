/* eslint-disable no-unused-expressions */

import { Selector } from 'testcafe';
import { $ } from '../selectors';

/* global fixture, test */

fixture`Nested Comments`
  .page`http://localhost:3000/nested-comments`
  .before(async () => {
    await new Promise(r => setTimeout(r, 1000));
  });

test('should render the nested comments page', async t => {
  await t.expect($('h1').textContent).contains('Nested Comments');
});

test('should render top-level comments', async t => {
  await t.expect(Selector('fieldset').exists).ok();
});

test('should render comment body text', async t => {
  await t.expect(Selector('p').withText('Great post!').exists).ok();
  await t.expect(Selector('p').withText('Can you explain more?').exists).ok();
});

test('should render nested replies via recursive component', async t => {
  await t.expect(Selector('p').withText('I agree!').exists).ok({ timeout: 5000 });
  await t.expect(Selector('p').withText('Thanks!').exists).ok();
});

test('should render reply forms', async t => {
  await t.expect(Selector('form').exists).ok();
  await t.expect(Selector('input[name=message]').exists).ok();
  await t.expect(Selector('form button').exists).ok();
});