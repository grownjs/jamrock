/* eslint-disable no-unused-expressions */

import { Selector as $ } from 'testcafe';
import { $debug } from '../selectors';

/* global fixture, test */

fixture`Session tests`
  .page`http://localhost:3000`;

test('should navigate through pages', async t => {
  await t.expect($debug.exists).notOk();

  const email = `foo.${Math.random().toString(36).substr(2)}@candy.bar`;

  // check for errors
  await t.click($('a[href="/login"]'));
  await t.typeText($('input[name=email]'), email, { replace: true });
  await t.typeText($('input[name=password]'), 'bazzinga', { replace: true });
  await t.click($('[type=submit]'));

  await t.expect($('[data-test\\:id=failure]').withText('Failed to authenticate').exists).ok();

  // new account
  await t.click($('a[href="/new"]'));
  await t.typeText($('input[name=address]'), email, { replace: true });
  await t.typeText($('input[name=a_password]'), 'bazzinga', { replace: true });
  await t.typeText($('input[name=b_password]'), 'bazzinga', { replace: true });
  await t.click($('[type=submit]'));

  await t.expect($('p').withText('Now you can login!').exists).ok();
});
