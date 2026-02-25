import './runtime.js';

import { fs, path } from './deps.js';

import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export const capabilities = { serve: true, build: true, watch: true, init: true };

const getUnoCSSModule = () => import('../vendor/unocss-core.js');
const getLessModule = () => import('../vendor/less.js');
const getChokidarModule = () => import('npm:chokidar');

export default options => createEnvironment({ fs, path }, options, {
  createServer,
  capabilities,
  getLessModule,
  getUnoCSSModule,
  getChokidarModule,
});
