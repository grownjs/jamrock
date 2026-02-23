import './runtime.js';

import { fs, path } from './deps.js';

import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export const capabilities = { serve: true, build: true, watch: true, init: true };

export default options => createEnvironment({ fs, path }, options, {
  createServer,
  capabilities,
  getUnoCSSModule: () => import('../vendor/unocss-core.js'),
  getLessModule: () => import('../vendor/less.js'),
  getChokidarModule: () => import('npm:chokidar'),
});
