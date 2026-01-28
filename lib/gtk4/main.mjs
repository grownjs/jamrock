import './runtime.js';

import { fs, path } from './deps.js';
import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

function createChokidarFallback() {
  function on() { }
  function watch() {
    return { on };
  }
  return { watch };
}

export default options => createEnvironment({ fs, path }, options, {
  createServer,
  // getUnoCSSModule: () => import('@unocss/core'),
  getChokidarModule: createChokidarFallback,
});
