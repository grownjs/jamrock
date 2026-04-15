import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['flipped', 'matched', 'moves'] });
test('game state signals are accessible', async ({ setSignal }) => {
  assert((await setSignal('moves', 0))?.ok, 'reset moves ok');
});
