import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['lastKey', 'keyCount'] });
test('can reset shortcut counts', async ({ setSignal }) => {
  assert((await setSignal('keyCount', 0))?.ok, 'reset ok');
  assert((await setSignal('lastKey', 'None'))?.ok, 'reset lastKey ok');
});
