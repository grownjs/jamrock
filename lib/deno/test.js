import './runtime.js';

import { fs, path } from './deps.js';
import { createTestingEnvironment } from '../../dist/server.mjs';

export * from '../../dist/server.mjs';

export const capabilities = { serve: true, build: true, watch: true, init: true };

const getLessModule = () => import('../vendor/less.js');
const getUnoCSSModule = () => import('../vendor/unocss-core.js');

export const createSandbox = options => createTestingEnvironment({ fs, path }, options, {
  capabilities,
  getLessModule,
  getUnoCSSModule,
});
