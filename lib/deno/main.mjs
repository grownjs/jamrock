import './runtime.js';

import { fs, path } from './deps.js';

import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export default options => createEnvironment({ fs, path }, options, {
  createServer,
  getUnoCSSModule: () => import('npm:@unocss/core'),
  getChokidarModule: () => import('npm:chokidar'),
});
