import './runtime.js';

import { fs, path } from './deps.js';
import { createTestingEnvironment } from '../../dist/server.mjs';

export * from '../../dist/server.mjs';

export const createSandbox = options => createTestingEnvironment({ fs, path }, options, {
  getUnoCSSModule: () => import('npm:@unocss/core'),
});
