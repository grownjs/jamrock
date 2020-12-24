/* eslint-disable no-unused-expressions */

import { Selector as $ } from 'testcafe';
import { $debug } from '../selectors';

/* global fixture, test */

fixture`Smoke tests`
  .page`http://localhost:3000`;

test.only('should navigate through pages', async t => {
  await t.expect($debug.exists).notOk();

  await t.click($('a[href="/ws"]'));
  await t.expect($('p').withText('Items:').exists).ok();

  const email = `foo.${Math.random().toString(36).substr(2)}@candy.bar`;

  // check for errors
  await t.click($('a[href="/login"]'));
  await t.typeText($('input[name=email]'), email, { replace: true });
  await t.typeText($('input[name=password]'), 'bazzinga', { replace: true });
  await t.click($('[type=submit]'));

  await t.expect($('[data-test-id=failure]').withText('User not found.').exists).ok();

  // new account
  await t.click($('a[href="/new"]'));
  await t.typeText($('input[name=address]'), email, { replace: true });
  await t.click($('[type=submit]'));

  await t.expect($('h3').withText('Thank you!').exists).ok();

  // hydration
  await t.navigateTo('/bundle').expect($('button[disabled]').count).eql(1);
  await t.expect($('p').withText('IT JUST WORKS? OH MY!! (OSOMS!!)').exists).ok();
  await t.wait(1000);
  await t.expect($('button[disabled]').count).eql(0);
});
