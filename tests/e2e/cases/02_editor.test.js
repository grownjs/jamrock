/* eslint-disable no-unused-expressions */

import { $ } from '../selectors';

/* global fixture, test */

fixture`Live Editor`
  .page`http://localhost:3000/editor`;

test('should render the /editor page', async t => {
  await t.expect($('@debug').exists).notOk();
  await t.expect($('@editor.clear').exists).ok();

  await t.switchToIframe($('@editor.preview'))
    .expect($('body').textContent).contains('Cannot GET /');

  await t.switchToMainWindow();
  await t.click($('@editor.add'));

  await t.expect($('@editor.source').nth(0).find('input').value).eql('pages/index.html');
  await t.click($('@editor.go')).wait(100);

  await t.switchToIframe($('@editor.preview'))
    .expect($('body').textContent).contains('It works');

  await t.switchToMainWindow();
});
