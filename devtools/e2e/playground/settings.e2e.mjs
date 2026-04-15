import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['darkMode', 'notifications', 'fontSize', 'volume'] });
test('can toggle settings', async ({ setSignal }) => {
  assert((await setSignal('darkMode', true))?.ok, 'dark mode on ok');
  assert((await setSignal('darkMode', false))?.ok, 'dark mode off ok');
  assert((await setSignal('fontSize', 18))?.ok, 'font size ok');
});
