import './runtime.js';
import { fs, path } from './deps.js';
import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export const capabilities = { serve: true, build: false, watch: false, init: false };
export const getUnoCSSModule = () => import('../vendor/unocss-core.js');
export const getLessModule = () => import('../vendor/less.js');
export const getChokidarModule = () => null;

export default function createCloudflareEnvironment(options) {
  return createEnvironment({ fs, path }, options, {
    createServer,
    capabilities,
    getUnoCSSModule,
    getLessModule,
    getChokidarModule,
  });
}
