import './runtime.js';

import { fs, path } from './deps.js';

import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export default options => createEnvironment({ fs, path }, options, {
  createServer,
  getUnoCSSModule: () => import('../vendor/unocss-core.js'),
  getLessModule: () => import('../vendor/less.js'),
  getChokidarModule: () => import('npm:chokidar'),
});
