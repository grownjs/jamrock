import { standardSuite } from './shared.mjs';
import { test, assert } from '../runner.mjs';
standardSuite({ signals: ['notificationType'] });
test('can change notification type', async ({ setSignal }) => {
  assert((await setSignal('notificationType', 'success'))?.ok, 'set type ok');
  assert((await setSignal('notificationType', 'error'))?.ok, 'set error ok');
});
