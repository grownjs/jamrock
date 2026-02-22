import './runtime.js';
import { fs, path } from './deps.js';
import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export const getUnoCSSModule = () => import('@unocss/core');
export const getLessModule = () => import('less/dist/less.js');

export default function createTxikiEnvironment(options) {
  return createEnvironment({ fs, path }, options, {
    createServer,
    getUnoCSSModule,
    getLessModule,
  });
}
