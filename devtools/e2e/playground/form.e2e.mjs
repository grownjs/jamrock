import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['name', 'email', 'age', 'volume'] });
test('can set form field values', async ({ setSignal }) => {
  assert((await setSignal('name', 'test'))?.ok, 'name ok');
  assert((await setSignal('email', 'test@test.com'))?.ok, 'email ok');
});
