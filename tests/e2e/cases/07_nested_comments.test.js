/* eslint-disable no-unused-expressions */

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

test('should render reply forms with rpc:call and trigger', async t => {
  await t.expect($('.reply-form').exists).ok();
});

test('should render hidden message_id in reply forms', async t => {
  await t.expect($('input[name=message_id]').count).gte(2);
});

test('should render reply form submit buttons', async t => {
  await t.expect($('form.reply-form button[type=submit]').exists).ok();
});