import './runtime.js';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { createTestingEnvironment } from '../../dist/server.mjs';

export * from '../../dist/server.mjs';

export const capabilities = { serve: true, build: true, watch: true, init: true };

export const createSandbox = options => createTestingEnvironment({ fs, path }, options, {
  capabilities,
  getUnoCSSModule: () => import('@unocss/core'),
  getLessModule: () => import('less'),
});
