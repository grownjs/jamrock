import { test } from '../runner.mjs';

// Bus error 10 on GTK4/macOS — pre-existing issue in TASKS.md
test.skip('window exists', () => {});
test.skip('signals accessible', () => {});
