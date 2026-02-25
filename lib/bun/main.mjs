import './runtime.js';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export const capabilities = { serve: true, build: true, watch: true, init: true };

const getUnoCSSModule = () => import('../vendor/unocss-core.js');
const getLessModule = () => import('../vendor/less.js');
const getChokidarModule = () => import('chokidar');

export default options => createEnvironment({ fs, path }, options, {
  createServer,
  capabilities,
  getLessModule,
  getUnoCSSModule,
  getChokidarModule,
});
