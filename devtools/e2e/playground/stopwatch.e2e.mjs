import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['running', 'laps'] });
test('can reset stopwatch via signals', async ({ setSignal }) => {
  assert((await setSignal('running', false))?.ok, 'stop ok');
  assert((await setSignal('time', 0))?.ok, 'reset time ok');
});
