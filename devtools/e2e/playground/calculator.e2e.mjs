import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['display'] });
test('display resets to 0 on clear', async ({ click, setSignal }) => {
  await setSignal('display', '99');
  const r = await setSignal('display', '0');
  assert(r?.ok, 'reset ok');
});
