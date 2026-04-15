import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['selectedItem'] });
test('shopping list has initial items', async ({ snapshot }) => {
  const r = await snapshot();
  assert(r?.ok, 'snapshot ok');
});
