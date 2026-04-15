import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['page'] });
test('can switch pages via signal', async ({ setSignal }) => {
  assert((await setSignal('page', 'widgets'))?.ok, 'switch to widgets ok');
  assert((await setSignal('page', 'home'))?.ok, 'switch to home ok');
});
