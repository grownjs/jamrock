import './runtime.js';
import { fs, path } from './deps.js';
import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export const getUnoCSSModule = () => import('../vendor/unocss-core.js');
export const getLessModule = () => import('../vendor/less.js');

export default function createWinterJSEnvironment(options) {
  return createEnvironment({ fs, path }, options, {
    createServer,
    getUnoCSSModule,
    getLessModule,
  });
}
