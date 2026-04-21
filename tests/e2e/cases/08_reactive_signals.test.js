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

test('should switch between else-if branches', async t => {
  const countBtn = $('@count-btn');
  const labelZero = $('@label-zero');
  const labelOne = $('@label-one');
  const labelMany = $('@label-many');

  await t.expect($('@heading').exists).ok({ timeout: 5000 });
  await t.expect(labelZero.exists).ok({ timeout: 3000 });
  await t.expect(labelOne.exists).notOk({ timeout: 1000 });
  await t.expect(labelMany.exists).notOk({ timeout: 1000 });

  await t.click(countBtn);
  await t.expect(labelOne.exists).ok({ timeout: 3000 });
  await t.expect(labelZero.exists).notOk({ timeout: 1000 });

  await t.click(countBtn);
  await t.expect(labelMany.exists).ok({ timeout: 3000 });
  await t.expect(labelOne.exists).notOk({ timeout: 1000 });
});

test('should display computed signal value', async t => {
  const countBtn = $('@count-btn');
  const computedLabel = $('@computed-label');

  await t.expect($('@heading').exists).ok({ timeout: 5000 });
  await t.expect(computedLabel.textContent).eql('zero', { timeout: 3000 });

  await t.click(countBtn);
  await t.expect(computedLabel.textContent).eql('one', { timeout: 3000 });

  await t.click(countBtn);
  await t.expect(computedLabel.textContent).eql('many', { timeout: 3000 });
});

test('should update signal interpolation in text nodes', async t => {
  const countBtn = $('@count-btn');
  const toggleBtn = $('@toggle-btn');

  await t.expect($('@heading').exists).ok({ timeout: 5000 });

  await t.click(toggleBtn);
  await t.expect($('@panel').exists).ok({ timeout: 3000 });

  const panelText = $('@panel-text');
  await t.expect(panelText.textContent).contains('0', { timeout: 3000 });

  await t.click(countBtn);
  await t.expect(panelText.textContent).contains('1', { timeout: 3000 });

  await t.click(countBtn);
  await t.click(countBtn);
  await t.expect(panelText.textContent).contains('3', { timeout: 3000 });
});

test('should render and modify signal-driven each list', async t => {
  const addBtn = $('@add-btn');
  const removeBtn = $('@remove-btn');

  await t.expect($('@list-heading').exists).ok({ timeout: 5000 });

  const items = await $('li.item-list').count;
  await t.expect(items).eql(3, { timeout: 3000 });

  await t.click(removeBtn);
  const afterRemove = await $('li.item-list').count;
  await t.expect(afterRemove).eql(2, { timeout: 3000 });

  await t.click(addBtn);
  const afterAdd = await $('li.item-list').count;
  await t.expect(afterAdd).eql(3, { timeout: 3000 });

  await t.click(removeBtn);
  await t.click(removeBtn);
  await t.click(removeBtn);
  const afterEmpty = await $('li.item-list').count;
  await t.expect(afterEmpty).eql(0, { timeout: 3000 });
  await t.expect($('@empty-list').exists).ok({ timeout: 3000 });
});
