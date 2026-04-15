import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['currentPage', 'clickCount'] });
test('can navigate between pages', async ({ setSignal }) => {
  assert((await setSignal('currentPage', 'settings'))?.ok, 'settings ok');
  assert((await setSignal('currentPage', 'about'))?.ok, 'about ok');
  assert((await setSignal('currentPage', 'home'))?.ok, 'home ok');
});
