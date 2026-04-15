import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['todos', 'input'] });
test('can update todo input', async ({ setSignal }) => {
  assert((await setSignal('input', 'Buy milk'))?.ok, 'set input ok');
  assert((await setSignal('input', ''))?.ok, 'clear input ok');
});
