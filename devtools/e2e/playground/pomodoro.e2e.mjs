import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['mode', 'timeLeft', 'running', 'sessions'] });
test('can reset timer via signals', async ({ setSignal }) => {
  assert((await setSignal('running', false))?.ok, 'stop ok');
  assert((await setSignal('sessions', 0))?.ok, 'reset sessions ok');
});
