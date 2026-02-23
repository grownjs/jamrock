import './runtime.mjs';

import * as fs from 'fs';
import * as path from 'path';

import { createTestingEnvironment } from '../../dist/server.mjs';

export * from '../../dist/server.mjs';

export const capabilities = { serve: true, build: true, watch: true, init: true };

export const createSandbox = options => createTestingEnvironment({ fs, path }, options, {
  capabilities,
  getUnoCSSModule: () => import('@unocss/core'),
  getLessModule: () => import('less'),
});
