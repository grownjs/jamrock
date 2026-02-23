import './runtime.js';

import { fs, path } from './deps.js';
import { createTestingEnvironment } from '../../dist/server.mjs';

export * from '../../dist/server.mjs';

export const capabilities = { serve: true, build: true, watch: true, init: true };

export const createSandbox = options => createTestingEnvironment({ fs, path }, options, {
  capabilities,
  getUnoCSSModule: () => import('npm:@unocss/core'),
  getLessModule: () => import('npm:less'),
});
