/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';
import { form } from '../helpers';

/* global fixture, test */

fixture`Basic forms`
  .page`http://localhost:3000/forms`;

test('should render the /forms page', async t => {
  await t.expect($('@debug').exists).notOk();
  await t.expect($('@failure').exists).notOk();

  await form('@form.user')
    .fill({ fullname: 'x' }).submit()
    .check({ emailaddr: false }).failures(1).ok();

  await form('@form.user')
    .fill({ emailaddr: 'x@candy.bar' }).submit()
    .check({ emailaddr: true, description: false }).failures(1).ok();

  await form('@form.user')
    .fill({ description: 'this text is short' }).submit()
    .check({ emailaddr: true, description: 'should have a minimum length' }).failures(1).ok();

  await form('@form.user')
    .fill({ description: 'THIS SHOULD BE ENOUGH TO PASS THE TEST' }).submit()
    .check({ number: 'should be at least', description: true }).failures(1).ok();

  await form('@form.user')
    .fill({ number: '3' }).submit()
    .check({ number: true }).failures(0).ok();
});
