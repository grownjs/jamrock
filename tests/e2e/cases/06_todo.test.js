/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`Todo List RPC`
  .page`http://localhost:3000/todo`
  .before(async () => {
    await new Promise(r => setTimeout(r, 1000));
  });

test('should render the todo page', async t => {
  await t.expect($('h1').textContent).contains('Todo List');
});

test('should have input and add button', async t => {
  await t.expect($('@input').exists).ok();
  await t.expect($('@add').exists).ok();
});

test('should have clear button', async t => {
  await t.expect($('@clear').exists).ok();
});