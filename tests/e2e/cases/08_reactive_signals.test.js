/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`Reactive Signals`
  .page`http://localhost:3000/reactive`
  .skipJsErrors(true)
  .before(async () => {
    await new Promise(r => setTimeout(r, 3000));
  });

test('should toggle panel visibility with signal', async t => {
  const toggleBtn = $('@toggle-btn');
  const panel = $('@panel');
  const lowCount = $('@low-count');

  await t.expect($('@heading').exists).ok({ timeout: 5000 });
  await t.expect(lowCount.exists).ok({ timeout: 3000 });
  await t.expect(panel.exists).notOk({ timeout: 1000 });

  await t.click(toggleBtn);
  await t.expect(panel.exists).ok({ timeout: 3000 });

  await t.click(toggleBtn);
  await t.expect(panel.exists).notOk({ timeout: 3000 });
});

test('should update count in reactive if block', async t => {
  const countBtn = $('@count-btn');
  const lowCount = $('@low-count');
  const highCount = $('@high-count');

  await t.expect($('@heading').exists).ok({ timeout: 5000 });
  await t.expect(lowCount.exists).ok({ timeout: 3000 });
  await t.expect(highCount.exists).notOk({ timeout: 1000 });

  await t.click(countBtn);
  await t.click(countBtn);
  await t.click(countBtn);

  await t.expect(highCount.exists).ok({ timeout: 3000 });
  await t.expect(lowCount.exists).notOk({ timeout: 1000 });
});
