import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['red', 'green', 'blue', 'alpha'] });
test('can set individual color channels', async ({ setSignal }) => {
  assert((await setSignal('red', 255))?.ok, 'red ok');
  assert((await setSignal('green', 128))?.ok, 'green ok');
  assert((await setSignal('blue', 0))?.ok, 'blue ok');
});
