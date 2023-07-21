import './runtime.mjs';

import * as fs from 'fs';
import * as path from 'path';

import { createTestingEnvironment } from '../../src/server.mjs';

export * from '../../src/server.mjs';

export const createSandbox = options => createTestingEnvironment({ fs, path }, options, {
  getUnoCSSModule: () => import('@unocss/core'),
});
