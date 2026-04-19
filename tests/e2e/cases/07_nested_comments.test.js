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
  await t.expect($('@heading').exists).ok();
});

test('should render reply forms and like buttons', async t => {
  await t.expect($('@reply-form').exists).ok();
  await t.expect($('@like-btn').exists).ok();
});

test('should submit reply via SSE rpc:call and see new comment', async t => {
  const input = $('@reply-input').nth(0);
  const submit = $('@reply-submit').nth(0);

  await t.expect(input.exists).ok({ timeout: 5000 });
  await t.typeText(input, 'Hello from test');
  await t.click(submit);

  const newComment = Selector('p').withText('Hello from test');
  await t.expect(newComment.exists).ok({ timeout: 8000 });
});

test('should like a comment via SSE rpc:call on button', async t => {
  const likeBtn = Selector('button.like-btn').nth(0);

  await t.expect(likeBtn.exists).ok({ timeout: 5000 });
  await t.click(likeBtn);

  await t.expect(likeBtn.textContent).contains('1', { timeout: 8000 });
});