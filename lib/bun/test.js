import './runtime.js';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { createTestingEnvironment } from '../../dist/server.mjs';

export * from '../../dist/server.mjs';

export const createSandbox = options => createTestingEnvironment({ fs, path }, options, {
  getUnoCSSModule: () => import('@unocss/core'),
});
