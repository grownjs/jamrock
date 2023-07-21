import './runtime.mjs';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { createServer } from './server.mjs';
// import { createEnvironment } from '../../src/server.mjs';
import { createEnvironment } from '../../dist/server.mjs';

export default options => createEnvironment({ fs, path }, options, {
  createServer,
  getUnoCSSModule: () => import('@unocss/core'),
  getChokidarModule: () => import('chokidar'),
});
