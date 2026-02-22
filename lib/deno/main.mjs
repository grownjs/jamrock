import './runtime.js';

import { fs, path } from './deps.js';

import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export default options => createEnvironment({ fs, path }, options, {
  createServer,
  getUnoCSSModule: () => import('npm:@unocss/core'),
  getLessModule: () => import('npm:less'),
  getChokidarModule: () => import('npm:chokidar'),
});
