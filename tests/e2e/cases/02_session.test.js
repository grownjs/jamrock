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

  await t.expect($('[data-test\\:id=failure]').withText('Failed to authenticate').exists).ok({ timeout: 10000 });

  // new account
  await t.click($('a[href="/new"]'));
  await t.typeText($('input[name=address]'), email, { replace: true });
  await t.typeText($('input[name=a_password]'), 'bazzinga', { replace: true });
  await t.typeText($('input[name=b_password]'), 'bazzinga', { replace: true });
  await t.click($('[type=submit]'));

  // Wait for the page to navigate to /login after successful registration
  await t.expect($('h3').withText('Please log in').exists).ok({ timeout: 10000 });
  await t.expect($('li').withText('Now you can login!').exists).ok({ timeout: 10000 });
});
