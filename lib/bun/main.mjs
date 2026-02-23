import './runtime.js';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export const capabilities = { serve: true, build: true, watch: true, init: true };

export default options => createEnvironment({ fs, path }, options, {
  createServer,
  capabilities,
  getUnoCSSModule: () => import('../vendor/unocss-core.js'),
  getLessModule: () => import('../vendor/less.js'),
  getChokidarModule: () => import('chokidar'),
});
