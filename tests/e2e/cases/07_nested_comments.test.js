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

test('should render reply forms with rpc:call and trigger', async t => {
  await t.expect($('.reply-form').exists).ok();
  await t.expect($('input[name=message_id]').count).gte(2);
  await t.expect($('form.reply-form button[type=submit]').exists).ok();
});

test('should submit reply via SSE rpc:call and see new comment', async t => {
  const form = Selector('form.reply-form').nth(0);
  const input = form.find('input[name=message]');
  const submit = form.find('button[type=submit]');

  await t.expect(input.exists).ok({ timeout: 5000 });
  await t.typeText(input, 'Hello from test');
  await t.click(submit);

  const newComment = Selector('p').withText('Hello from test');
  await t.expect(newComment.exists).ok({ timeout: 8000 });
});