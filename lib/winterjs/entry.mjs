import './runtime.js';
import { fs, path } from './deps.js';
import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

const src = process.env.WINTERJS_SRC || 'pages';
const host = process.env.WINTERJS_HOST || '127.0.0.1';
const quiet = process.env.WINTERJS_QUIET === '1';
const port = parseInt(process.env.WINTERJS_PORT || '8080', 10);

const capabilities = { serve: true, build: false, watch: false, init: false };

const getUnoCSSModule = () => import('../vendor/unocss-core.js');
const getLessModule = () => import('../vendor/less.js');

const env = createEnvironment({ fs, path }, {
  src,
  dest: 'dist',
  port,
  host,
  quiet,
  prefix: '@',
  public: 'public',
}, {
  createServer,
  capabilities,
  getLessModule,
  getUnoCSSModule,
});

env.serve().catch(console.error);
