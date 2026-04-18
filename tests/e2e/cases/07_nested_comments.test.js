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
  await t.expect($('fieldset').exists).ok();
});

test('should render author names in comments', async t => {
  await t.expect(Selector('strong').withText('Alice').exists).ok();
  await t.expect(Selector('strong').withText('Eve').exists).ok();
});

test('should render comment body text', async t => {
  await t.expect(Selector('p').withText('Great post!').exists).ok();
  await t.expect(Selector('p').withText('Can you explain more?').exists).ok();
});